import http from 'node:http';
import {readFile, mkdir, writeFile, unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import {brotliCompressSync,gzipSync,constants as zlibConstants} from 'node:zlib';
import bcrypt from 'bcryptjs';
import {DatabaseSync} from 'node:sqlite';
import {products as catalog, validPhone, validCity} from '../www/shop.js';
import {createKabshAiService} from './ai-service.mjs';
import {MAX_UPLOAD_BYTES,validateImageUpload,safeStoredFilename} from './upload-security.mjs';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const root=fileURLToPath(new URL('../www/',import.meta.url));
const dataDir=fileURLToPath(new URL('../data/',import.meta.url));
const uploadsDir=path.join(dataDir,'uploads');

async function loadEnv(){
  try{
    const raw=await readFile(path.join(projectRoot,'.env'),'utf8');
    for(const line of raw.split(/\r?\n/)){
      const trimmed=line.trim();
      if(!trimmed||trimmed.startsWith('#')) continue;
      const idx=trimmed.indexOf('=');
      if(idx<1) continue;
      const key=trimmed.slice(0,idx).trim();
      let value=trimmed.slice(idx+1).trim();
      if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))) value=value.slice(1,-1);
      if(process.env[key]===undefined) process.env[key]=value;
    }
  }catch(e){
    if(e?.code!=='ENOENT') console.warn('Unable to read .env:',e.message);
  }
}
await loadEnv();
await mkdir(dataDir,{recursive:true});
await mkdir(uploadsDir,{recursive:true});

const dbPath=process.env.KABSH_DB_PATH?path.resolve(process.env.KABSH_DB_PATH):path.join(dataDir,'kabsh-najd.sqlite3');
const db=new DatabaseSync(dbPath);
const PORT=Number(process.env.PORT||5173);
const hostArgIndex=process.argv.indexOf('--host');
const HOST=(hostArgIndex>=0&&process.argv[hostArgIndex+1])
  ? process.argv[hostArgIndex+1]
  : (process.env.HOST||'127.0.0.1');
const IS_PRODUCTION=env('NODE_ENV').toLowerCase()==='production';
const TRUST_PROXY=env('KABSH_TRUST_PROXY')==='1';
const COOKIE_SECURE=IS_PRODUCTION||env('KABSH_COOKIE_SECURE')==='1';
const PUBLIC_ORIGIN=(env('KABSH_PUBLIC_ORIGIN')||(IS_PRODUCTION?'https://ass-al-halaal.onrender.com':'')).replace(/\/+$/,'');
const ENFORCE_HTTPS=IS_PRODUCTION&&env('KABSH_ENFORCE_HTTPS')!=='0';
const DEFAULT_ADMIN_USER_ID=process.env.KABSH_DEFAULT_ADMIN_USER_ID||'ADM-JED-001';
const ADMIN_SESSION_HOURS=Math.max(1,Math.min(24,Number(process.env.KABSH_ADMIN_SESSION_HOURS||8)||8));
const CUSTOMER_SESSION_DAYS=Math.max(1,Math.min(30,Number(process.env.KABSH_CUSTOMER_SESSION_DAYS||30)||30));
const ADMIN_OTP_MINUTES=Math.max(2,Math.min(10,Number(process.env.KABSH_ADMIN_OTP_MINUTES||5)||5));
const ADMIN_OTP_MAX_ATTEMPTS=Math.max(3,Math.min(10,Number(process.env.KABSH_ADMIN_OTP_MAX_ATTEMPTS||5)||5));
const ADMIN_OTP_RESEND_SECONDS=Math.max(30,Math.min(180,Number(process.env.KABSH_ADMIN_OTP_RESEND_SECONDS||45)||45));
const ADMIN_OTP_MAX_RESENDS=Math.max(1,Math.min(5,Number(process.env.KABSH_ADMIN_OTP_MAX_RESENDS||3)||3));
const ADMIN_LOGIN_WINDOW_MINUTES=10;
const ADMIN_LOGIN_MAX_CHALLENGES=5;
const ADMIN_PASSWORD_MAX_ATTEMPTS=8;
const CUSTOMER_LOGIN_MAX_ATTEMPTS=10;
const AUTH_RATE_WINDOW_MINUTES=10;
const AUTH_BLOCK_MINUTES=15;
const CAPTCHA_PROVIDER=env('KABSH_CAPTCHA_PROVIDER').toLowerCase();
const CAPTCHA_SECRET=env('KABSH_CAPTCHA_SECRET');
const configuredOtpPepper=env('KABSH_OTP_PEPPER');
if(IS_PRODUCTION&&!configuredOtpPepper) throw new Error('KABSH_OTP_PEPPER is required when NODE_ENV=production');
const OTP_PEPPER=configuredOtpPepper||crypto.randomBytes(32).toString('hex');
const DELIVERY_FEE=25;
const PROMO_CODES={HARRI2026:{percent:7},JEDDAH10:{percent:7}};
const allowedStatuses=['received','confirmed','preparing','ready','delivery','completed','cancelled'];
const districts=['حي الروضة','أبحر الشمالية','الحمدانية','الصفا','الزهراء','المرجان'];
const WA_API_BASE='https://graph.facebook.com';
const waStreamClients=new Set();

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};

const COMPRESSIBLE_EXTENSIONS=new Set(['.html','.js','.css','.svg','.json','.txt','.xml']);
const IMMUTABLE_ASSET_EXTENSIONS=new Set(['.png','.jpg','.jpeg','.webp','.svg','.ico','.woff','.woff2']);
function acceptsEncoding(req,name){
  return String(req.headers['accept-encoding']||'').toLowerCase().split(',').some(part=>part.trim().startsWith(name));
}
function staticCacheControl(file){
  const ext=path.extname(file).toLowerCase();
  if(ext==='.html')return 'no-cache';
  if(IMMUTABLE_ASSET_EXTENSIONS.has(ext))return 'public, max-age=604800, stale-while-revalidate=86400';
  if(ext==='.js'||ext==='.css')return 'public, max-age=3600, stale-while-revalidate=86400';
  return 'public, max-age=3600';
}
function sendStatic(req,res,file,data){
  const ext=path.extname(file).toLowerCase();
  const headers={
    'Content-Type':types[ext]||'application/octet-stream',
    'Cache-Control':staticCacheControl(file),
    'Vary':'Accept-Encoding'
  };
  let payload=data;
  if(COMPRESSIBLE_EXTENSIONS.has(ext)&&data.length>=1024){
    if(acceptsEncoding(req,'br')){
      payload=brotliCompressSync(data,{params:{[zlibConstants.BROTLI_PARAM_QUALITY]:5}});
      headers['Content-Encoding']='br';
    }else if(acceptsEncoding(req,'gzip')){
      payload=gzipSync(data,{level:6});
      headers['Content-Encoding']='gzip';
    }
  }
  headers['Content-Length']=String(payload.length);
  res.writeHead(200,headers);
  res.end(payload);
}


function nowIso(){return new Date().toISOString()}
function env(name){return String(process.env[name]||'').trim()}

function initDb(){
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS products(
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    price REAL NOT NULL CHECK(price>0),
    kg REAL NOT NULL CHECK(kg>0),
    category TEXT NOT NULL,
    image TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders(
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    address TEXT NOT NULL,
    delivery_date TEXT NOT NULL,
    slot TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL DEFAULT 'cod',
    status TEXT NOT NULL,
    subtotal REAL NOT NULL,
    delivery_fee REAL NOT NULL,
    total REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
  CREATE TABLE IF NOT EXISTS slaughterhouses(
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Jeddah',
    license TEXT NOT NULL DEFAULT '',
    veterinary_supervisor TEXT NOT NULL DEFAULT '',
    capacity_per_day INTEGER NOT NULL DEFAULT 0 CHECK(capacity_per_day>=0),
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_operations(
    order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    slaughterhouse_id TEXT REFERENCES slaughterhouses(id),
    veterinary_status TEXT NOT NULL DEFAULT 'pending' CHECK(veterinary_status IN ('pending','passed','failed')),
    slaughter_status TEXT NOT NULL DEFAULT 'pending' CHECK(slaughter_status IN ('pending','in_progress','completed')),
    preparation_status TEXT NOT NULL DEFAULT 'pending' CHECK(preparation_status IN ('pending','in_progress','ready')),
    assigned_at TEXT,
    vet_checked_at TEXT,
    slaughter_started_at TEXT,
    slaughter_completed_at TEXT,
    preparation_started_at TEXT,
    preparation_completed_at TEXT,
    assigned_by TEXT NOT NULL DEFAULT 'System Administrator',
    notes TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_operations_slaughterhouse ON order_operations(slaughterhouse_id,updated_at DESC);
  CREATE TABLE IF NOT EXISTS order_operation_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_value TEXT,
    to_value TEXT,
    actor TEXT NOT NULL DEFAULT 'System Administrator',
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_operation_events_order ON order_operation_events(order_id,created_at DESC);
  CREATE TABLE IF NOT EXISTS couriers(
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle TEXT NOT NULL DEFAULT '',
    plate TEXT NOT NULL DEFAULT '',
    zone TEXT NOT NULL DEFAULT 'Jeddah',
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_deliveries(
    order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    courier_id TEXT REFERENCES couriers(id),
    delivery_status TEXT NOT NULL DEFAULT 'unassigned' CHECK(delivery_status IN ('unassigned','assigned','out_for_delivery','delivered','failed')),
    assigned_at TEXT,
    out_for_delivery_at TEXT,
    delivered_at TEXT,
    failed_at TEXT,
    receiver_name TEXT NOT NULL DEFAULT '',
    pod_note TEXT NOT NULL DEFAULT '',
    failed_reason TEXT NOT NULL DEFAULT '',
    assigned_by TEXT NOT NULL DEFAULT 'System Administrator',
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_deliveries_courier ON order_deliveries(courier_id,updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_order_deliveries_status ON order_deliveries(delivery_status,updated_at DESC);
  CREATE TABLE IF NOT EXISTS delivery_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_value TEXT,
    to_value TEXT,
    actor TEXT NOT NULL DEFAULT 'System Administrator',
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_delivery_events_order ON delivery_events(order_id,created_at DESC);
  CREATE TABLE IF NOT EXISTS order_items(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    qty INTEGER NOT NULL CHECK(qty>0),
    unit_price REAL NOT NULL,
    cut TEXT NOT NULL,
    pack TEXT NOT NULL,
    fat TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_media(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK(media_type IN ('image','video')),
    url TEXT NOT NULL,
    caption_ar TEXT NOT NULL DEFAULT '',
    caption_en TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL DEFAULT 'System Administrator',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_media_order ON order_media(order_id,created_at DESC);
  CREATE TABLE IF NOT EXISTS whatsapp_settings(
    id INTEGER PRIMARY KEY CHECK(id=1),
    phone_number_id TEXT NOT NULL DEFAULT '',
    waba_id TEXT NOT NULL DEFAULT '',
    display_phone_number TEXT NOT NULL DEFAULT '',
    graph_version TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS whatsapp_messages(
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('in','out')),
    message_type TEXT NOT NULL DEFAULT 'text',
    body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'received',
    order_id TEXT,
    wa_timestamp TEXT,
    created_at TEXT NOT NULL,
    raw_json TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_wa_phone_created ON whatsapp_messages(phone,created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_wa_order ON whatsapp_messages(order_id);
  CREATE TABLE IF NOT EXISTS whatsapp_webhook_events(
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    created_at TEXT NOT NULL,
    raw_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS finance_payments(
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK(amount>0),
    method TEXT NOT NULL DEFAULT 'cod',
    reference TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    actor TEXT NOT NULL DEFAULT 'System Administrator',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_finance_payments_order ON finance_payments(order_id,created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_finance_payments_created ON finance_payments(created_at DESC);
  CREATE TABLE IF NOT EXISTS finance_settlements(
    id TEXT PRIMARY KEY,
    party TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount>0),
    method TEXT NOT NULL,
    reference TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','cancelled')),
    actor TEXT NOT NULL DEFAULT 'System Administrator',
    created_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_finance_settlements_status ON finance_settlements(status,created_at DESC);
  CREATE TABLE IF NOT EXISTS finance_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    order_id TEXT,
    actor TEXT NOT NULL DEFAULT 'System Administrator',
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_finance_events_created ON finance_events(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_finance_events_order ON finance_events(order_id);
  `);

  /* Central append-only audit trail. Source event tables remain the system-of-record
     for their own modules; triggers mirror them here for one searchable timeline. */
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_events(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('orders','finance','communications','security','system','marketing')),
      severity TEXT NOT NULL DEFAULT 'low' CHECK(severity IN ('low','medium','high')),
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'System Administrator',
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      order_id TEXT,
      from_value TEXT,
      to_value TEXT,
      action TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      UNIQUE(source_type,source_id)
    );
    CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC,id DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_events_order ON audit_events(order_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_events_category ON audit_events(category,severity,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor,created_at DESC);

    CREATE TRIGGER IF NOT EXISTS audit_events_no_update
    BEFORE UPDATE ON audit_events
    BEGIN
      SELECT RAISE(ABORT,'audit_events is append-only');
    END;

    CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
    BEFORE DELETE ON audit_events
    BEGIN
      SELECT RAISE(ABORT,'audit_events is append-only');
    END;

    CREATE TRIGGER IF NOT EXISTS audit_from_order_events
    AFTER INSERT ON order_events
    BEGIN
      INSERT OR IGNORE INTO audit_events(
        source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
        order_id,from_value,to_value,action,details_json,created_at
      ) VALUES(
        'order_event',CAST(NEW.id AS TEXT),'orders',
        CASE WHEN NEW.to_status='cancelled' THEN 'medium' ELSE 'low' END,
        NEW.event_type,
        CASE WHEN NEW.event_type='order.created' THEN 'Customer' ELSE 'System Administrator' END,
        'order',NEW.order_id,NEW.order_id,NEW.from_status,NEW.to_status,NEW.event_type,'{}',NEW.created_at
      );
    END;

    CREATE TRIGGER IF NOT EXISTS audit_from_operation_events
    AFTER INSERT ON order_operation_events
    BEGIN
      INSERT OR IGNORE INTO audit_events(
        source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
        order_id,from_value,to_value,action,details_json,created_at
      ) VALUES(
        'operation_event',CAST(NEW.id AS TEXT),'orders',
        CASE
          WHEN NEW.event_type LIKE '%veterinary_status%' AND NEW.to_value='failed' THEN 'high'
          WHEN NEW.event_type LIKE '%notes%' THEN 'low'
          ELSE 'low'
        END,
        NEW.event_type,NEW.actor,'slaughterhouse_operation',NEW.order_id,
        NEW.order_id,NEW.from_value,NEW.to_value,NEW.event_type,NEW.details_json,NEW.created_at
      );
    END;

    CREATE TRIGGER IF NOT EXISTS audit_from_delivery_events
    AFTER INSERT ON delivery_events
    BEGIN
      INSERT OR IGNORE INTO audit_events(
        source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
        order_id,from_value,to_value,action,details_json,created_at
      ) VALUES(
        'delivery_event',CAST(NEW.id AS TEXT),'orders',
        CASE
          WHEN NEW.to_value='failed' OR NEW.event_type LIKE '%failed%' THEN 'medium'
          ELSE 'low'
        END,
        NEW.event_type,NEW.actor,'delivery',NEW.order_id,
        NEW.order_id,NEW.from_value,NEW.to_value,NEW.event_type,NEW.details_json,NEW.created_at
      );
    END;

    CREATE TRIGGER IF NOT EXISTS audit_from_finance_events
    AFTER INSERT ON finance_events
    BEGIN
      INSERT OR IGNORE INTO audit_events(
        source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
        order_id,from_value,to_value,action,details_json,created_at
      ) VALUES(
        'finance_event',CAST(NEW.id AS TEXT),'finance',
        CASE
          WHEN NEW.event_type LIKE '%failed%' OR NEW.event_type LIKE '%reversed%' OR NEW.event_type LIKE '%refund%' THEN 'high'
          ELSE 'low'
        END,
        NEW.event_type,NEW.actor,NEW.entity_type,NEW.entity_id,
        NEW.order_id,NULL,NULL,NEW.event_type,NEW.details_json,NEW.created_at
      );
    END;

    CREATE TRIGGER IF NOT EXISTS audit_from_whatsapp_messages
    AFTER INSERT ON whatsapp_messages
    BEGIN
      INSERT OR IGNORE INTO audit_events(
        source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
        order_id,from_value,to_value,action,details_json,created_at
      ) VALUES(
        'whatsapp_message',NEW.id,'communications','low',
        CASE WHEN NEW.direction='in' THEN 'whatsapp.message.received' ELSE 'whatsapp.message.sent' END,
        CASE WHEN NEW.direction='in' THEN 'Customer' ELSE 'System Administrator' END,
        'whatsapp_message',NEW.id,NEW.order_id,NEW.direction,NEW.status,
        CASE WHEN NEW.direction='in' THEN 'message.received' ELSE 'message.sent' END,
        '{}',NEW.created_at
      );
    END;
  `);

  /* Backfill existing module event history into the central audit timeline.
     UNIQUE(source_type,source_id) makes this safe to run on every restart. */
  db.exec(`
    INSERT OR IGNORE INTO audit_events(
      source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
      order_id,from_value,to_value,action,details_json,created_at
    )
    SELECT
      'order_event',CAST(id AS TEXT),'orders',
      CASE WHEN to_status='cancelled' THEN 'medium' ELSE 'low' END,
      event_type,
      CASE WHEN event_type='order.created' THEN 'Customer' ELSE 'System Administrator' END,
      'order',order_id,order_id,from_status,to_status,event_type,'{}',created_at
    FROM order_events;

    INSERT OR IGNORE INTO audit_events(
      source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
      order_id,from_value,to_value,action,details_json,created_at
    )
    SELECT
      'operation_event',CAST(id AS TEXT),'orders',
      CASE WHEN event_type LIKE '%veterinary_status%' AND to_value='failed' THEN 'high' ELSE 'low' END,
      event_type,actor,'slaughterhouse_operation',order_id,order_id,from_value,to_value,event_type,details_json,created_at
    FROM order_operation_events;

    INSERT OR IGNORE INTO audit_events(
      source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
      order_id,from_value,to_value,action,details_json,created_at
    )
    SELECT
      'delivery_event',CAST(id AS TEXT),'orders',
      CASE WHEN to_value='failed' OR event_type LIKE '%failed%' THEN 'medium' ELSE 'low' END,
      event_type,actor,'delivery',order_id,order_id,from_value,to_value,event_type,details_json,created_at
    FROM delivery_events;

    INSERT OR IGNORE INTO audit_events(
      source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
      order_id,from_value,to_value,action,details_json,created_at
    )
    SELECT
      'finance_event',CAST(id AS TEXT),'finance',
      CASE WHEN event_type LIKE '%failed%' OR event_type LIKE '%reversed%' OR event_type LIKE '%refund%' THEN 'high' ELSE 'low' END,
      event_type,actor,entity_type,entity_id,order_id,NULL,NULL,event_type,details_json,created_at
    FROM finance_events;

    INSERT OR IGNORE INTO audit_events(
      source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
      order_id,from_value,to_value,action,details_json,created_at
    )
    SELECT
      'whatsapp_message',id,'communications','low',
      CASE WHEN direction='in' THEN 'whatsapp.message.received' ELSE 'whatsapp.message.sent' END,
      CASE WHEN direction='in' THEN 'Customer' ELSE 'System Administrator' END,
      'whatsapp_message',id,order_id,direction,status,
      CASE WHEN direction='in' THEN 'message.received' ELSE 'message.sent' END,
      '{}',created_at
    FROM whatsapp_messages;
  `);


  /* Real Users & Governance database.
     Existing frontend demo records are seeded once and become persistent server data. */
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users(
      id TEXT PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner','ops','finance','slaughterhouse','compliance','marketing')),
      scope TEXT NOT NULL CHECK(scope IN ('all','north','central','east')),
      mfa TEXT NOT NULL DEFAULT 'pending' CHECK(mfa IN ('fido2','totp','pending')),
      last_login TEXT NOT NULL DEFAULT 'Never',
      session_ar TEXT NOT NULL DEFAULT '—',
      session_en TEXT NOT NULL DEFAULT '—',
      device TEXT NOT NULL DEFAULT '—',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role,status);
    CREATE INDEX IF NOT EXISTS idx_admin_users_scope ON admin_users(scope,status);

    CREATE TABLE IF NOT EXISTS role_permissions(
      role TEXT NOT NULL,
      module TEXT NOT NULL,
      can_view INTEGER NOT NULL DEFAULT 0 CHECK(can_view IN (0,1)),
      can_manage INTEGER NOT NULL DEFAULT 0 CHECK(can_manage IN (0,1)),
      PRIMARY KEY(role,module)
    );

    CREATE TABLE IF NOT EXISTS governance_approvals(
      id TEXT PRIMARY KEY,
      title_ar TEXT NOT NULL,
      title_en TEXT NOT NULL,
      requested_by TEXT NOT NULL REFERENCES admin_users(id),
      risk TEXT NOT NULL CHECK(risk IN ('low','medium','high')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      requested_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_governance_approvals_status ON governance_approvals(status,risk,requested_at DESC);

    CREATE TABLE IF NOT EXISTS governance_events(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'System Administrator',
      from_value TEXT,
      to_value TEXT,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_governance_events_created ON governance_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_governance_events_entity ON governance_events(entity_type,entity_id,created_at DESC);

    DROP TRIGGER IF EXISTS audit_from_governance_events;
    CREATE TRIGGER audit_from_governance_events
    AFTER INSERT ON governance_events
    BEGIN
      INSERT OR IGNORE INTO audit_events(
        source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
        order_id,from_value,to_value,action,details_json,created_at
      ) VALUES(
        'governance_event',CAST(NEW.id AS TEXT),'security',
        CASE
          WHEN NEW.event_type LIKE '%denied%' OR NEW.event_type LIKE '%suspended%' OR NEW.event_type LIKE '%rejected%' OR NEW.event_type LIKE '%role%' OR NEW.event_type LIKE '%scope%' THEN 'high'
          WHEN NEW.event_type LIKE '%approval%' OR NEW.event_type LIKE '%mfa%' THEN 'medium'
          ELSE 'low'
        END,
        NEW.event_type,NEW.actor,NEW.entity_type,NEW.entity_id,
        NULL,NEW.from_value,NEW.to_value,NEW.event_type,NEW.details_json,NEW.created_at
      );
    END;

    INSERT OR IGNORE INTO audit_events(
      source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
      order_id,from_value,to_value,action,details_json,created_at
    )
    SELECT
      'governance_event',CAST(id AS TEXT),'security',
      CASE
        WHEN event_type LIKE '%denied%' OR event_type LIKE '%suspended%' OR event_type LIKE '%rejected%' OR event_type LIKE '%role%' OR event_type LIKE '%scope%' THEN 'high'
        WHEN event_type LIKE '%approval%' OR event_type LIKE '%mfa%' THEN 'medium'
        ELSE 'low'
      END,
      event_type,actor,entity_type,entity_id,NULL,from_value,to_value,event_type,details_json,created_at
    FROM governance_events;
  `);

  const seedUser=db.prepare(`INSERT OR IGNORE INTO admin_users(
    id,name_ar,name_en,email,phone,role,scope,mfa,last_login,session_ar,session_en,device,status,created_at,updated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const defaultAdminUsers=[
    ['ADM-JED-001','سعود بن عبد العزيز السلمي','Saud bin Abdulaziz Al-Sulami','s.alsulami@kabshnajd.sa','0500001001','owner','all','fido2','12 min','جدة - حي الشاطئ','Jeddah - Al Shati','Safari macOS','active'],
    ['ADM-JED-002','عبدالرحمن الحربي','Abdulrahman Al-Harbi','a.harbi@kabshnajd.sa','0500001002','ops','central','totp','34 min','جدة - الروضة','Jeddah - Al Rawdah','Chrome Windows','active'],
    ['ADM-JED-003','نورة الغامدي','Noura Al-Ghamdi','n.ghamdi@kabshnajd.sa','0500001003','finance','all','totp','1 h','جدة - الزهراء','Jeddah - Al Zahra','Edge Windows','active'],
    ['ADM-JED-004','خالد الزهراني','Khalid Al-Zahrani','k.zahrani@kabshnajd.sa','0500001004','slaughterhouse','central','totp','2 h','المسلخ الرئيسي','Main slaughterhouse','Android','active'],
    ['ADM-JED-005','ريم الشهري','Reem Al-Shahri','r.shahri@kabshnajd.sa','0500001005','compliance','all','fido2','Yesterday','جدة - الحمدانية','Jeddah - Al Hamdaniyah','Safari iOS','active'],
    ['ADM-JED-006','مازن العمري','Mazen Al-Omari','m.omari@kabshnajd.sa','0500001006','marketing','north','pending','3 d','شمال جدة','North Jeddah','Chrome Windows','suspended']
  ];
  const governanceSeedTime='2026-10-24T12:00:00.000Z';
  for(const u of defaultAdminUsers) seedUser.run(...u,governanceSeedTime,governanceSeedTime);

  const seedApproval=db.prepare(`INSERT OR IGNORE INTO governance_approvals(
    id,title_ar,title_en,requested_by,risk,status,requested_at
  ) VALUES(?,?,?,?,?,'pending',?)`);
  const defaultApprovals=[
    ['APR-001','رفع صلاحية تعديل التسويات المالية','Grant finance settlement edit permission','ADM-JED-003','high'],
    ['APR-002','إضافة مدير تشغيل لشمال جدة','Add North Jeddah operations manager','ADM-JED-002','medium'],
    ['APR-003','تفويض مؤقت لإدارة الحملات','Temporary marketing campaign delegation','ADM-JED-006','low']
  ];
  for(const a of defaultApprovals) seedApproval.run(...a,governanceSeedTime);

  const permissionMap={
    owner:['dashboard','suppliers','orders','delivery','finance','ai','whatsapp','marketing','users','audit'],
    ops:['dashboard','suppliers','orders','delivery','ai','whatsapp','marketing','audit'],
    finance:['dashboard','finance','audit'],
    slaughterhouse:['dashboard','suppliers','orders','delivery','audit'],
    compliance:['dashboard','suppliers','orders','delivery','users','audit'],
    marketing:['dashboard','marketing','whatsapp']
  };
  const manageMap={
    owner:['dashboard','suppliers','orders','delivery','finance','ai','whatsapp','marketing','users','audit'],
    ops:['suppliers','orders','delivery','ai','whatsapp','marketing'],
    finance:['finance'],
    slaughterhouse:['orders'],
    compliance:['users','audit'],
    marketing:['marketing','whatsapp']
  };
  const seedPermission=db.prepare(`INSERT INTO role_permissions(role,module,can_view,can_manage)
    VALUES(?,?,?,?)
    ON CONFLICT(role,module) DO UPDATE SET can_view=excluded.can_view,can_manage=excluded.can_manage`);
  for(const role of ['owner','ops','finance','slaughterhouse','compliance','marketing']){
    for(const module of ['dashboard','suppliers','orders','delivery','finance','ai','whatsapp','marketing','users','audit']){
      seedPermission.run(role,module,permissionMap[role].includes(module)?1:0,manageMap[role].includes(module)?1:0);
    }
  }

  const upsert=db.prepare(`INSERT INTO products(id,name_ar,name_en,price,kg,category,image,active,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name_ar=excluded.name_ar,name_en=excluded.name_en,price=excluded.price,kg=excluded.kg,category=excluded.category,image=excluded.image,active=1,updated_at=excluded.updated_at`);
  const now=nowIso();
  for(const p of catalog) upsert.run(p.id,p.ar,p.en,p.price,p.kg,p.category,p.image||'',1,now);

  const upsertSlaughterhouse=db.prepare(`INSERT INTO slaughterhouses(id,name_ar,name_en,city,license,veterinary_supervisor,capacity_per_day,active,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name_ar=excluded.name_ar,name_en=excluded.name_en,city=excluded.city,license=excluded.license,
      veterinary_supervisor=excluded.veterinary_supervisor,capacity_per_day=excluded.capacity_per_day,active=excluded.active,updated_at=excluded.updated_at`);
  const defaultSlaughterhouses=[
    ['SLH-JED-CENTRAL','مسلخ أمانة جدة المركزي','Jeddah Central Municipality Slaughterhouse','Jeddah','JED-SLH-00912','Veterinary Supervisor A',150,1],
    ['SLH-JED-NORTH','مسلخ شمال جدة المعتمد','North Jeddah Approved Slaughterhouse','Jeddah','JED-SLH-01427','Veterinary Supervisor B',90,1],
    ['SLH-JED-SOUTH','مسلخ جنوب جدة المعتمد','South Jeddah Approved Slaughterhouse','Jeddah','JED-SLH-01833','Veterinary Supervisor C',100,1]
  ];
  for(const s of defaultSlaughterhouses) upsertSlaughterhouse.run(...s,now);

  const upsertCourier=db.prepare(`INSERT INTO couriers(id,name_ar,name_en,phone,vehicle,plate,zone,active,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name_ar=excluded.name_ar,name_en=excluded.name_en,phone=excluded.phone,vehicle=excluded.vehicle,
      plate=excluded.plate,zone=excluded.zone,active=excluded.active,updated_at=excluded.updated_at`);
  const defaultCouriers=[
    ['CR-JED-001','يوسف الصالح','Yousaf Al-Saleh','0531944400','Toyota Hiace','JED-4821','Central Jeddah',1],
    ['CR-JED-002','فهد الحربي','Fahad Al-Harbi','0531944401','Hyundai H1','JED-5318','North Jeddah',1],
    ['CR-JED-003','سالم الغامدي','Salem Al-Ghamdi','0531944402','Toyota Hilux','JED-6672','South Jeddah',1]
  ];
  for(const c of defaultCouriers) upsertCourier.run(...c,now);

  const ensureOperation=db.prepare(`INSERT OR IGNORE INTO order_operations(
    order_id,slaughterhouse_id,veterinary_status,slaughter_status,preparation_status,assigned_at,assigned_by,notes,updated_at
  ) VALUES(?,?,'pending','pending','pending',?,'System Administrator','',?)`);
  for(const o of db.prepare('SELECT id,created_at FROM orders').all()) ensureOperation.run(o.id,'SLH-JED-CENTRAL',o.created_at||now,now);

  const existing=db.prepare('SELECT id FROM whatsapp_settings WHERE id=1').get();
  if(!existing){
    db.prepare(`INSERT INTO whatsapp_settings(id,phone_number_id,waba_id,display_phone_number,graph_version,enabled,updated_at)
      VALUES(1,?,?,?,?,?,?)`).run(
      env('WHATSAPP_PHONE_NUMBER_ID'),
      env('WHATSAPP_WABA_ID'),
      env('WHATSAPP_DISPLAY_PHONE_NUMBER'),
      env('WHATSAPP_GRAPH_VERSION'),
      env('WHATSAPP_ENABLED')==='1'?1:0,
      now
    );
  }
}
initDb();

function hasColumn(table,column){
  return db.prepare(`PRAGMA table_info(${table})`).all().some(row=>row.name===column);
}
function initAdminAuth(){
  if(!hasColumn('admin_users','password_hash')) db.exec(`ALTER TABLE admin_users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`);
  if(!hasColumn('admin_users','password_updated_at')) db.exec(`ALTER TABLE admin_users ADD COLUMN password_updated_at TEXT`);

  // Real 2FA policy fields. Keep the legacy `mfa` column for backwards
  // compatibility, but do not use its old TOTP/FIDO2 labels in the UI.
  const hadOtpMode=hasColumn('admin_users','otp_mode');
  if(!hadOtpMode) db.exec(`ALTER TABLE admin_users ADD COLUMN otp_mode TEXT NOT NULL DEFAULT 'email'`);
  if(!hasColumn('admin_users','email_verified')) db.exec(`ALTER TABLE admin_users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`);
  if(!hasColumn('admin_users','phone_verified')) db.exec(`ALTER TABLE admin_users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0`);
  if(!hasColumn('admin_users','last_2fa_at')) db.exec(`ALTER TABLE admin_users ADD COLUMN last_2fa_at TEXT`);
  if(!hadOtpMode){
    db.exec(`UPDATE admin_users SET otp_mode=CASE
      WHEN mfa='fido2' THEN 'both'
      WHEN mfa='totp' THEN 'email'
      ELSE 'pending'
    END`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_auth_challenges(
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      otp_hash TEXT NOT NULL,
      channel TEXT NOT NULL,
      destination_masked TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      resend_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_sent_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_admin_auth_challenges_admin ON admin_auth_challenges(admin_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_auth_challenges_expiry ON admin_auth_challenges(expires_at);

    CREATE TABLE IF NOT EXISTS admin_sessions(
      token_hash TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id,expires_at);

    CREATE TABLE IF NOT EXISTS auth_rate_limits(
      bucket TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      window_started_at TEXT NOT NULL,
      blocked_until TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_scope ON auth_rate_limits(scope,updated_at);

    CREATE TABLE IF NOT EXISTS admin_security_challenges(
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL,
      new_value TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      resend_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_sent_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_admin_security_challenges_admin ON admin_security_challenges(admin_id,created_at DESC);
  `);

  if(!hasColumn('admin_sessions','ip_address')) db.exec(`ALTER TABLE admin_sessions ADD COLUMN ip_address TEXT NOT NULL DEFAULT ''`);
  if(!hasColumn('admin_sessions','user_agent')) db.exec(`ALTER TABLE admin_sessions ADD COLUMN user_agent TEXT NOT NULL DEFAULT ''`);

  const adminId=DEFAULT_ADMIN_USER_ID;
  const existing=db.prepare('SELECT * FROM admin_users WHERE id=?').get(adminId);
  if(existing){
    const configuredEmail=env('KABSH_ADMIN_EMAIL').toLowerCase();
    const configuredPhone=normalizePhone(env('KABSH_ADMIN_PHONE'));
    if(configuredEmail&&validEmail(configuredEmail)&&configuredEmail!==existing.email){
      db.prepare('UPDATE admin_users SET email=?,updated_at=? WHERE id=?').run(configuredEmail,nowIso(),adminId);
    }
    if(configuredPhone&&validPhone(configuredPhone)&&configuredPhone!==existing.phone){
      db.prepare('UPDATE admin_users SET phone=?,updated_at=? WHERE id=?').run(configuredPhone,nowIso(),adminId);
    }

    const bootstrapPassword=env('KABSH_ADMIN_BOOTSTRAP_PASSWORD');
    const resetPassword=env('KABSH_RESET_ADMIN_PASSWORD')==='1';
    const latest=db.prepare('SELECT password_hash FROM admin_users WHERE id=?').get(adminId);
    if(bootstrapPassword&&(resetPassword||!latest?.password_hash)){
      if(bootstrapPassword.length<12){
        console.warn('KABSH_ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters; admin password was not changed.');
      }else{
        db.prepare('UPDATE admin_users SET password_hash=?,password_updated_at=?,updated_at=? WHERE id=?')
          .run(hashPassword(bootstrapPassword),nowIso(),nowIso(),adminId);
      }
    }
  }

  db.prepare('DELETE FROM admin_auth_challenges WHERE datetime(expires_at)<=datetime(?) OR (consumed_at IS NOT NULL AND datetime(consumed_at)<=datetime(?))')
    .run(nowIso(),new Date(Date.now()-24*60*60*1000).toISOString());
  db.prepare('DELETE FROM admin_sessions WHERE datetime(expires_at)<=datetime(?)').run(nowIso());
  db.prepare('DELETE FROM admin_security_challenges WHERE datetime(expires_at)<=datetime(?) OR (consumed_at IS NOT NULL AND datetime(consumed_at)<=datetime(?))')
    .run(nowIso(),new Date(Date.now()-24*60*60*1000).toISOString());
}
function initCustomerAuth(){
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_accounts(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT 'password' CHECK(provider IN ('password','google')),
      google_sub TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_accounts_email ON customer_accounts(lower(email));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_accounts_google_sub ON customer_accounts(google_sub) WHERE google_sub IS NOT NULL;
    CREATE TABLE IF NOT EXISTS customer_sessions(
      token_hash TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id,expires_at);
  `);
  if(!hasColumn('orders','customer_id')) db.exec('ALTER TABLE orders ADD COLUMN customer_id TEXT');
  if(!hasColumn('orders','order_code')) db.exec('ALTER TABLE orders ADD COLUMN order_code TEXT');
  db.exec(`UPDATE orders SET order_code=id WHERE order_code IS NULL OR trim(order_code)=''`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code); CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id,created_at DESC);`);
  db.prepare('DELETE FROM customer_sessions WHERE datetime(expires_at)<=datetime(?)').run(nowIso());
}
initCustomerAuth();
initAdminAuth();

function normalizeOrigin(value){
  try{return new URL(String(value||'')).origin}catch{return ''}
}
function isAllowedOrigin(value){
  const origin=normalizeOrigin(value);
  if(!origin)return false;
  if(PUBLIC_ORIGIN&&origin===PUBLIC_ORIGIN)return true;
  if(!IS_PRODUCTION&&/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(origin))return true;
  return false;
}
function requestIsSecure(req){
  if(req.socket?.encrypted)return true;
  const forwarded=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim().toLowerCase();
  return (TRUST_PROXY||IS_PRODUCTION)&&forwarded==='https';
}
function enforceHttps(req,res){
  if(!ENFORCE_HTTPS||requestIsSecure(req))return false;
  const base=PUBLIC_ORIGIN||'https://ass-al-halaal.onrender.com';
  let target=base+'/';
  try{target=new URL(req.url||'/',base).toString()}catch{}
  res.writeHead(308,{'Location':target,'Cache-Control':'no-store'});
  res.end();
  return true;
}
function applySecurityHeaders(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('X-DNS-Prefetch-Control','off');
  res.setHeader('Origin-Agent-Cluster','?1');
  const csp=[
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' https://accounts.google.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
    "frame-src https://accounts.google.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'"
  ];
  if(IS_PRODUCTION)csp.push('upgrade-insecure-requests');
  res.setHeader('Content-Security-Policy',csp.join('; '));
  const origin=String(req.headers.origin||'').trim();
  if(origin&&isAllowedOrigin(origin)){
    res.setHeader('Access-Control-Allow-Origin',normalizeOrigin(origin));
    res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Vary','Origin');
  }
  if(IS_PRODUCTION&&COOKIE_SECURE)res.setHeader('Strict-Transport-Security','max-age=63072000; includeSubDomains; preload');
}
function handleCorsPreflight(req,res,url){
  if(req.method!=='OPTIONS'||!url.pathname.startsWith('/api/'))return false;
  const origin=String(req.headers.origin||'').trim();
  if(origin&&!isAllowedOrigin(origin)){
    json(res,403,{error:'Origin not allowed',code:'ORIGIN_FORBIDDEN'});
    return true;
  }
  if(origin){
    res.setHeader('Access-Control-Allow-Origin',normalizeOrigin(origin));
    res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Vary','Origin');
  }
  res.writeHead(204,{
    'Access-Control-Allow-Methods':'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type, X-Requested-With',
    'Access-Control-Max-Age':'600',
    'Cache-Control':'no-store'
  });
  res.end();
  return true;
}
function rejectUntrustedBrowserOrigin(req,res,url){
  if(!url.pathname.startsWith('/api/'))return false;
  if(!['POST','PUT','PATCH','DELETE'].includes(req.method||''))return false;
  const origin=String(req.headers.origin||'').trim();
  if(!origin)return false;
  if(isAllowedOrigin(origin))return false;
  json(res,403,{error:'Origin not allowed',code:'ORIGIN_FORBIDDEN'});
  return true;
}
function json(res,status,data){
  const payload=JSON.stringify(data);
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(payload)});
  res.end(payload);
}
function publicError(error,fallback){
  return IS_PRODUCTION?fallback:String(error?.message||fallback);
}
function text(res,status,value){res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(String(value??''))}
function normalizePhone(value){
  const p=String(value||'').replace(/[^+\d]/g,'');
  if(p.startsWith('+966')) return '0'+p.slice(4);
  if(p.startsWith('966')) return '0'+p.slice(3);
  return p;
}
function parseCookies(req){
  const out={};
  for(const part of String(req.headers.cookie||'').split(';')){
    const idx=part.indexOf('=');if(idx<1)continue;
    out[part.slice(0,idx).trim()]=decodeURIComponent(part.slice(idx+1).trim());
  }
  return out;
}
function customerTokenHash(token){return crypto.createHash('sha256').update(String(token||'')).digest('hex')}
function publicCustomer(row){
  if(!row)return null;
  return {id:row.id,name:row.name,email:row.email,phone:row.phone||'',provider:row.provider,status:row.status,created_at:row.created_at};
}
function customerFromRequest(req){
  const token=parseCookies(req).kn_customer_session||'';
  if(!token)return null;
  const row=db.prepare(`SELECT c.* FROM customer_sessions s JOIN customer_accounts c ON c.id=s.customer_id
    WHERE s.token_hash=? AND datetime(s.expires_at)>datetime(?) AND c.status='active'`).get(customerTokenHash(token),nowIso());
  return row||null;
}
function setCustomerSession(res,customerId){
  const token=crypto.randomBytes(32).toString('base64url');
  const created=nowIso();
  const maxAge=CUSTOMER_SESSION_DAYS*24*60*60;
  const expires=new Date(Date.now()+maxAge*1000).toISOString();
  db.prepare('INSERT INTO customer_sessions(token_hash,customer_id,created_at,expires_at) VALUES(?,?,?,?)').run(customerTokenHash(token),customerId,created,expires);
  appendSetCookie(res,`kn_customer_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${COOKIE_SECURE?'; Secure':''}`);
}
function clearCustomerSession(req,res){
  const token=parseCookies(req).kn_customer_session||'';
  if(token)db.prepare('DELETE FROM customer_sessions WHERE token_hash=?').run(customerTokenHash(token));
  appendSetCookie(res,`kn_customer_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE?'; Secure':''}`);
}
const BCRYPT_COST=12;
function hashPassword(password){
  // Keep the bootstrap path independent of const initialization order.
  return bcrypt.hashSync(String(password),12);
}
function verifyLegacyScrypt(password,stored){
  const [kind,salt,hash]=String(stored||'').split('$');
  if(kind!=='scrypt'||!salt||!hash)return false;
  const actual=crypto.scryptSync(String(password),salt,64);
  const expected=Buffer.from(hash,'hex');
  return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
}
function verifyPassword(password,stored){
  const value=String(stored||'');
  if(/^\$2[aby]\$/.test(value)){
    try{return bcrypt.compareSync(String(password),value)}catch{return false}
  }
  return verifyLegacyScrypt(password,value);
}
function passwordHashNeedsUpgrade(stored){
  return !/^\$2[aby]\$12\$/.test(String(stored||''));
}
const DUMMY_PASSWORD_HASH=hashPassword(`kabsh-dummy-${crypto.randomBytes(16).toString('hex')}`);
function authBucket(scope,key){
  return crypto.createHash('sha256').update(`${scope}:${String(key||'unknown').trim().toLowerCase()}`).digest('hex');
}
function authRateStatus(scope,key,maxAttempts,windowMinutes=AUTH_RATE_WINDOW_MINUTES){
  const bucket=authBucket(scope,key);
  const row=db.prepare('SELECT * FROM auth_rate_limits WHERE bucket=?').get(bucket);
  if(!row)return {allowed:true,bucket,retryAfter:0};
  const now=Date.now();
  const blockedUntil=Date.parse(String(row.blocked_until||''));
  if(Number.isFinite(blockedUntil)&&blockedUntil>now){
    return {allowed:false,bucket,retryAfter:Math.max(1,Math.ceil((blockedUntil-now)/1000))};
  }
  const started=Date.parse(String(row.window_started_at||''));
  if(!Number.isFinite(started)||now-started>=windowMinutes*60*1000){
    db.prepare('DELETE FROM auth_rate_limits WHERE bucket=?').run(bucket);
    return {allowed:true,bucket,retryAfter:0};
  }
  if(Number(row.attempts||0)>=maxAttempts){
    return {allowed:false,bucket,retryAfter:Math.max(1,Math.ceil((started+windowMinutes*60*1000-now)/1000))};
  }
  return {allowed:true,bucket,retryAfter:0};
}
function authRateFailure(scope,key,maxAttempts,windowMinutes=AUTH_RATE_WINDOW_MINUTES,blockMinutes=AUTH_BLOCK_MINUTES){
  const bucket=authBucket(scope,key);
  const now=Date.now();
  const nowText=new Date(now).toISOString();
  const row=db.prepare('SELECT * FROM auth_rate_limits WHERE bucket=?').get(bucket);
  const started=Date.parse(String(row?.window_started_at||''));
  const expired=!row||!Number.isFinite(started)||now-started>=windowMinutes*60*1000;
  const attempts=expired?1:Number(row.attempts||0)+1;
  const windowStarted=expired?nowText:row.window_started_at;
  const blockedUntil=attempts>=maxAttempts?new Date(now+blockMinutes*60*1000).toISOString():null;
  db.prepare(`INSERT INTO auth_rate_limits(bucket,scope,attempts,window_started_at,blocked_until,updated_at)
    VALUES(?,?,?,?,?,?)
    ON CONFLICT(bucket) DO UPDATE SET scope=excluded.scope,attempts=excluded.attempts,window_started_at=excluded.window_started_at,
      blocked_until=excluded.blocked_until,updated_at=excluded.updated_at`)
    .run(bucket,scope,attempts,windowStarted,blockedUntil,nowText);
  return {attempts,blockedUntil};
}
function authRateClear(scope,key){
  db.prepare('DELETE FROM auth_rate_limits WHERE bucket=?').run(authBucket(scope,key));
}
function captchaConfigured(){
  return CAPTCHA_PROVIDER==='turnstile'&&Boolean(CAPTCHA_SECRET);
}
async function verifyCaptchaToken(token,ip=''){
  if(!captchaConfigured())return {ok:true,skipped:true};
  const value=String(token||'').trim();
  if(!value)return {ok:false,code:'CAPTCHA_REQUIRED'};
  const form=new URLSearchParams({secret:CAPTCHA_SECRET,response:value});
  if(ip&&ip!=='unknown')form.set('remoteip',ip);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:form
  }).catch(()=>null);
  if(!response||!response.ok)return {ok:false,code:'CAPTCHA_UNAVAILABLE'};
  const result=await response.json().catch(()=>({success:false}));
  return result.success?{ok:true}:{ok:false,code:'CAPTCHA_INVALID'};
}
function captchaRequiredByGate(scope,key,softThreshold){
  const row=db.prepare('SELECT attempts FROM auth_rate_limits WHERE bucket=?').get(authBucket(scope,key));
  return captchaConfigured()&&Number(row?.attempts||0)>=softThreshold;
}
function hashCustomerPassword(password){return hashPassword(password)}
function verifyCustomerPassword(password,stored){return verifyPassword(password,stored)}
function makeCustomerId(){return `CUS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim().toLowerCase())}
async function verifyGoogleCredential(credential){
  const clientId=env('GOOGLE_CLIENT_ID');
  if(!clientId)throw new Error('Google sign-in is not configured on the server');
  const token=String(credential||'').trim();
  if(!token)throw new Error('Google credential is required');
  const response=await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  const info=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error('Google credential could not be verified');
  if(String(info.aud||'')!==clientId)throw new Error('Google credential audience mismatch');
  if(String(info.email_verified)!=='true')throw new Error('Google email is not verified');
  if(Number(info.exp||0)*1000<=Date.now())throw new Error('Google credential has expired');
  if(!['accounts.google.com','https://accounts.google.com'].includes(String(info.iss||'')))throw new Error('Google credential issuer is invalid');
  return {sub:String(info.sub||''),email:String(info.email||'').toLowerCase(),name:String(info.name||info.email||'Google Customer')};
}
function toWaPhone(value){
  const local=normalizePhone(value);
  if(/^05\d{8}$/.test(local)) return '966'+local.slice(1);
  const digits=String(value||'').replace(/\D/g,'');
  return /^9665\d{8}$/.test(digits)?digits:'';
}
function fromWaPhone(value){
  const p=String(value||'').replace(/\D/g,'');
  return /^9665\d{8}$/.test(p)?'0'+p.slice(3):p;
}
function appendSetCookie(res,cookie){
  const current=res.getHeader('Set-Cookie');
  if(!current)res.setHeader('Set-Cookie',cookie);
  else if(Array.isArray(current))res.setHeader('Set-Cookie',[...current,cookie]);
  else res.setHeader('Set-Cookie',[String(current),cookie]);
}
function adminTokenHash(token){return crypto.createHash('sha256').update(String(token||'')).digest('hex')}
function adminSessionFromRequest(req){
  const token=parseCookies(req).kn_admin_session||'';
  if(!token)return null;
  const row=db.prepare(`SELECT s.token_hash,s.admin_id,s.created_at,s.last_seen_at,s.expires_at,s.ip_address,s.user_agent,u.*
    FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_id
    WHERE s.token_hash=? AND datetime(s.expires_at)>datetime(?) AND u.status='active'`)
    .get(adminTokenHash(token),nowIso());
  if(!row)return null;
  const seen=nowIso();
  const ip=adminRequestIp(req);
  const userAgent=String(req.headers['user-agent']||'').slice(0,300);
  db.prepare(`UPDATE admin_sessions SET last_seen_at=?,
      ip_address=CASE WHEN trim(COALESCE(ip_address,''))='' THEN ? ELSE ip_address END,
      user_agent=CASE WHEN trim(COALESCE(user_agent,''))='' THEN ? ELSE user_agent END
    WHERE token_hash=?`).run(seen,ip,userAgent,row.token_hash);
  row.last_seen_at=seen;
  row.ip_address=row.ip_address||ip;
  row.user_agent=row.user_agent||userAgent;
  return row;
}
function setAdminSession(req,res,adminId){
  const token=crypto.randomBytes(32).toString('base64url');
  const created=nowIso();
  const expires=new Date(Date.now()+ADMIN_SESSION_HOURS*60*60*1000).toISOString();
  const ip=adminRequestIp(req);
  const userAgent=String(req.headers['user-agent']||'').slice(0,300);
  db.prepare('DELETE FROM admin_sessions WHERE datetime(expires_at)<=datetime(?)').run(created);
  db.prepare('INSERT INTO admin_sessions(token_hash,admin_id,created_at,last_seen_at,expires_at,ip_address,user_agent) VALUES(?,?,?,?,?,?,?)')
    .run(adminTokenHash(token),adminId,created,created,expires,ip,userAgent);
  appendSetCookie(res,`kn_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ADMIN_SESSION_HOURS*3600}${COOKIE_SECURE?'; Secure':''}`);
  return expires;
}
function clearAdminSession(req,res){
  const token=parseCookies(req).kn_admin_session||'';
  if(token)db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(adminTokenHash(token));
  appendSetCookie(res,`kn_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE?'; Secure':''}`);
}
function adminPreauthSignature(payload){
  return crypto.createHmac('sha256',OTP_PEPPER).update(payload).digest('base64url');
}
function makeAdminPreauthToken(challengeId,adminId,expiresAt){
  const payload=Buffer.from(JSON.stringify({c:String(challengeId),a:String(adminId),e:String(expiresAt)})).toString('base64url');
  return `${payload}.${adminPreauthSignature(payload)}`;
}
function readAdminPreauth(req){
  const raw=String(parseCookies(req).kn_admin_preauth||'');
  const dot=raw.lastIndexOf('.');
  if(dot<1)return null;
  const payload=raw.slice(0,dot),sig=raw.slice(dot+1);
  if(!safeEqualText(adminPreauthSignature(payload),sig))return null;
  try{
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    const expires=Date.parse(String(data.e||''));
    if(!data.c||!data.a||!Number.isFinite(expires)||expires<=Date.now())return null;
    return {challengeId:String(data.c),adminId:String(data.a),expiresAt:String(data.e)};
  }catch{return null}
}
function setAdminPreauth(res,challengeId,adminId,expiresAt){
  const token=makeAdminPreauthToken(challengeId,adminId,expiresAt);
  const maxAge=Math.max(60,Math.ceil((Date.parse(expiresAt)-Date.now())/1000));
  appendSetCookie(res,`kn_admin_preauth=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${COOKIE_SECURE?'; Secure':''}`);
}
function clearAdminPreauth(res){
  appendSetCookie(res,`kn_admin_preauth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE?'; Secure':''}`);
}
function challengeIsExpired(row){
  const expires=Date.parse(String(row?.expires_at||''));
  return !Number.isFinite(expires)||expires<=Date.now();
}
function resolveAdminChallenge(req,bodyData={}){
  const preauth=readAdminPreauth(req);
  const bodyId=String(bodyData.challenge_id||'').trim();
  const bodyAdminId=String(bodyData.admin_id||bodyData.adminId||'').trim().toUpperCase();
  let row=null;
  if(preauth?.challengeId)row=db.prepare('SELECT * FROM admin_auth_challenges WHERE id=?').get(preauth.challengeId)||null;
  if(!row&&bodyId)row=db.prepare('SELECT * FROM admin_auth_challenges WHERE id=?').get(bodyId)||null;
  const adminId=preauth?.adminId||bodyAdminId||row?.admin_id||'';
  if((!row||row.consumed_at||challengeIsExpired(row))&&adminId){
    const latest=db.prepare(`SELECT * FROM admin_auth_challenges WHERE admin_id=? AND consumed_at IS NULL ORDER BY datetime(created_at) DESC,id DESC LIMIT 1`).get(adminId)||null;
    if(latest&&!challengeIsExpired(latest))row=latest;
  }
  return {row,preauth,adminId};
}
function adminOk(req){return Boolean(adminSessionFromRequest(req))}
function adminOtpHash(challengeId,otp){
  return crypto.createHmac('sha256',OTP_PEPPER).update(`${challengeId}:${String(otp||'')}`).digest('hex');
}
function safeEqualText(a,b){
  const aa=Buffer.from(String(a||''));const bb=Buffer.from(String(b||''));
  return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);
}
function maskEmail(email){
  const [name,domain]=String(email||'').split('@');
  if(!name||!domain)return '';
  return `${name.slice(0,1)}${'*'.repeat(Math.max(3,name.length-2))}${name.length>1?name.slice(-1):''}@${domain}`;
}
function maskPhone(phone){
  const digits=String(phone||'').replace(/\D/g,'');
  if(digits.length<4)return '';
  return `${digits.slice(0,3)} *** *** ${digits.slice(-4)}`;
}
function toSaudiE164(value){
  const local=normalizePhone(value);
  if(/^05\d{8}$/.test(local))return `+966${local.slice(1)}`;
  const digits=String(value||'').replace(/\D/g,'');
  return /^9665\d{8}$/.test(digits)?`+${digits}`:'';
}
function otpProviderStatus(){
  return {
    email:Boolean(env('RESEND_API_KEY')&&env('KABSH_OTP_FROM_EMAIL')),
    sms:Boolean(env('TWILIO_ACCOUNT_SID')&&env('TWILIO_AUTH_TOKEN')&&env('TWILIO_FROM_NUMBER'))
  };
}
async function sendOtpEmail(user,otp){
  const apiKey=env('RESEND_API_KEY');
  const from=env('KABSH_OTP_FROM_EMAIL');
  if(!apiKey||!from)throw new Error('Email OTP provider is not configured');
  if(!validEmail(user.email))throw new Error('Admin email is not valid');
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      from,
      to:[user.email],
      subject:'Ass Al Halaal admin verification code',
      text:`Your Ass Al Halaal admin verification code is ${otp}. It expires in ${ADMIN_OTP_MINUTES} minutes.`,
      html:`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px"><h2>Admin verification</h2><p>Use this code to finish signing in to Ass Al Halaal:</p><div style="font-size:34px;font-weight:700;letter-spacing:8px;margin:24px 0">${otp}</div><p>This code expires in ${ADMIN_OTP_MINUTES} minutes. If you did not request it, do not share this code.</p></div>`
    })
  });
  if(!response.ok){
    const info=await response.text().catch(()=>'');
    throw new Error(`Email OTP delivery failed (${response.status})${info?`: ${info.slice(0,160)}`:''}`);
  }
}
async function sendOtpSms(user,otp){
  const sid=env('TWILIO_ACCOUNT_SID');
  const token=env('TWILIO_AUTH_TOKEN');
  const from=env('TWILIO_FROM_NUMBER');
  const to=toSaudiE164(user.phone);
  if(!sid||!token||!from)throw new Error('SMS OTP provider is not configured');
  if(!to)throw new Error('Admin mobile number is not valid');
  const form=new URLSearchParams({To:to,From:from,Body:`Ass Al Halaal admin code: ${otp}. Expires in ${ADMIN_OTP_MINUTES} minutes.`});
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{
    method:'POST',
    headers:{'Authorization':`Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:form
  });
  if(!response.ok){
    const info=await response.text().catch(()=>'');
    throw new Error(`SMS OTP delivery failed (${response.status})${info?`: ${info.slice(0,160)}`:''}`);
  }
}
async function deliverAdminOtp(user,otp,requested='auto'){
  const available=otpProviderStatus();
  const requestedMode=String(requested||'auto').toLowerCase();
  const modes=[];
  if(requestedMode==='email'&&available.email)modes.push('email');
  else if(requestedMode==='sms'&&available.sms)modes.push('sms');
  else if(requestedMode==='both'){
    if(available.email)modes.push('email');
    if(available.sms)modes.push('sms');
  }else{
    if(available.email)modes.push('email');
    if(available.sms)modes.push('sms');
  }
  if(!modes.length)throw new Error('No real OTP delivery provider is configured');
  const results=await Promise.allSettled(modes.map(mode=>mode==='email'?sendOtpEmail(user,otp):sendOtpSms(user,otp)));
  const delivered=modes.filter((_,i)=>results[i].status==='fulfilled');
  if(!delivered.length){
    const reason=results.find(x=>x.status==='rejected')?.reason?.message||'OTP delivery failed';
    throw new Error(reason);
  }
  const masked=[];
  if(delivered.includes('email'))masked.push(maskEmail(user.email));
  if(delivered.includes('sms'))masked.push(maskPhone(user.phone));
  return {channels:delivered,channel:delivered.join('+'),masked};
}
function adminAuthAudit(eventType,userId,details={}){
  try{
    governanceEvent(eventType,'admin_auth',String(userId||'unknown'),{
      actor:String(userId||'Unknown administrator'),
      details
    });
  }catch{}
}
function adminRequestIp(req){
  const forwarded=TRUST_PROXY?String(req.headers['x-forwarded-for']||'').split(',')[0].trim():'';
  return String(forwarded||req.socket?.remoteAddress||'unknown').slice(0,80);
}
function validateIncomingJson(value,depth=0){
  if(depth>8)throw new Error('JSON payload is nested too deeply');
  if(value===null||typeof value==='boolean'||typeof value==='number')return value;
  if(typeof value==='string'){
    if(value.length>20_000)throw new Error('Input value is too long');
    if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value))throw new Error('Input contains unsupported control characters');
    return value.normalize('NFC');
  }
  if(Array.isArray(value)){
    if(value.length>200)throw new Error('JSON array contains too many items');
    return value.map(item=>validateIncomingJson(item,depth+1));
  }
  if(typeof value==='object'){
    const entries=Object.entries(value);
    if(entries.length>200)throw new Error('JSON object contains too many fields');
    const clean=Object.create(null);
    for(const [key,item] of entries){
      if(['__proto__','prototype','constructor'].includes(key))throw new Error('Unsafe JSON key rejected');
      if(key.length>120)throw new Error('JSON field name is too long');
      clean[key]=validateIncomingJson(item,depth+1);
    }
    return clean;
  }
  throw new Error('Unsupported JSON value');
}
async function rawBody(req,max=1_000_000){
  const declared=Number(req.headers['content-length']||0);
  if(Number.isFinite(declared)&&declared>max)throw new Error('Payload too large');
  let raw='';
  for await(const chunk of req){
    raw+=chunk;
    if(Buffer.byteLength(raw,'utf8')>max)throw new Error('Payload too large');
  }
  return raw;
}
async function rawBuffer(req,max=MAX_UPLOAD_BYTES){
  const declared=Number(req.headers['content-length']||0);
  if(Number.isFinite(declared)&&declared>max)throw new Error('Upload exceeds 5 MB limit');
  const chunks=[];let total=0;
  for await(const chunk of req){
    const part=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
    total+=part.length;
    if(total>max)throw new Error('Upload exceeds 5 MB limit');
    chunks.push(part);
  }
  return Buffer.concat(chunks,total);
}
async function body(req){
  const contentType=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
  if(contentType&&contentType!=='application/json')throw new Error('Content-Type must be application/json');
  const raw=await rawBody(req);
  if(!raw) return Object.create(null);
  let parsed;
  try{parsed=JSON.parse(raw)}catch{throw new Error('Invalid JSON')}
  if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw new Error('JSON body must be an object');
  return validateIncomingJson(parsed);
}
function operationForOrder(orderId){
  const operation=db.prepare(`SELECT oo.*,s.name_ar slaughterhouse_name_ar,s.name_en slaughterhouse_name_en,s.city slaughterhouse_city,
      s.license slaughterhouse_license,s.veterinary_supervisor,s.capacity_per_day
    FROM order_operations oo LEFT JOIN slaughterhouses s ON s.id=oo.slaughterhouse_id WHERE oo.order_id=?`).get(orderId);
  if(!operation) return null;
  const events=db.prepare(`SELECT id,event_type,from_value,to_value,actor,details_json,created_at
    FROM order_operation_events WHERE order_id=? ORDER BY id`).all(orderId).map(e=>{
      let details={};try{details=JSON.parse(e.details_json||'{}')}catch{}
      return {...e,details};
    });
  return {...operation,events};
}
function mediaForOrder(orderId){
  return db.prepare(`SELECT id,order_id,media_type,url,caption_ar,caption_en,created_by,created_at
    FROM order_media WHERE order_id=? ORDER BY id DESC`).all(orderId);
}
function validOrderMediaUrl(value){
  const raw=String(value||'').trim();
  if(!raw||raw.length>1800)return '';
  if(/^https?:\/\//i.test(raw))return raw;
  if(/^\/?assets\//i.test(raw))return raw.startsWith('/')?raw:`/${raw}`;
  return '';
}
function listSlaughterhouses(){
  return db.prepare(`SELECT s.*,
      SUM(CASE WHEN o.status NOT IN ('completed','cancelled') THEN 1 ELSE 0 END) active_orders,
      SUM(CASE WHEN oo.preparation_status='in_progress' THEN 1 ELSE 0 END) preparing_orders,
      SUM(CASE WHEN oo.preparation_status='ready' AND o.status NOT IN ('completed','cancelled') THEN 1 ELSE 0 END) ready_orders
    FROM slaughterhouses s
    LEFT JOIN order_operations oo ON oo.slaughterhouse_id=s.id
    LEFT JOIN orders o ON o.id=oo.order_id
    GROUP BY s.id ORDER BY s.active DESC,s.name_en`).all().map(r=>({...r,active:Boolean(r.active)}));
}
function operationsSummary(){
  const row=db.prepare(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN veterinary_status='pending' THEN 1 ELSE 0 END) vet_pending,
      SUM(CASE WHEN veterinary_status='passed' THEN 1 ELSE 0 END) vet_passed,
      SUM(CASE WHEN slaughter_status='in_progress' THEN 1 ELSE 0 END) slaughtering,
      SUM(CASE WHEN preparation_status='in_progress' THEN 1 ELSE 0 END) preparing,
      SUM(CASE WHEN preparation_status='ready' THEN 1 ELSE 0 END) ready
    FROM order_operations`).get();
  return {...row,slaughterhouses:listSlaughterhouses()};
}
function operationEvent(orderId,eventType,fromValue,toValue,{actor='System Administrator',details={}}={}){
  db.prepare(`INSERT INTO order_operation_events(order_id,event_type,from_value,to_value,actor,details_json,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(orderId,eventType,fromValue??null,toValue??null,String(actor||'System Administrator'),JSON.stringify(details||{}),nowIso());
}
function ensureOrderOperation(orderId,assignedAt=nowIso()){
  const existing=db.prepare('SELECT order_id FROM order_operations WHERE order_id=?').get(orderId);
  if(existing) return;
  const defaultHouse=db.prepare('SELECT id FROM slaughterhouses WHERE active=1 ORDER BY rowid LIMIT 1').get();
  db.prepare(`INSERT INTO order_operations(order_id,slaughterhouse_id,veterinary_status,slaughter_status,preparation_status,assigned_at,assigned_by,notes,updated_at)
    VALUES(?,?,'pending','pending','pending',?,'System Administrator','',?)`).run(orderId,defaultHouse?.id||null,assignedAt,nowIso());
  operationEvent(orderId,'operation.created',null,defaultHouse?.id||null,{details:{automatic:true}});
}

function deliveryEvent(orderId,eventType,fromValue,toValue,{actor='System Administrator',details={}}={}){
  db.prepare(`INSERT INTO delivery_events(order_id,event_type,from_value,to_value,actor,details_json,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(orderId,eventType,fromValue??null,toValue??null,String(actor||'System Administrator'),JSON.stringify(details||{}),nowIso());
}
function ensureOrderDelivery(orderId,createdAt=nowIso()){
  const existing=db.prepare('SELECT order_id FROM order_deliveries WHERE order_id=?').get(orderId);
  if(existing) return;
  db.prepare(`INSERT INTO order_deliveries(order_id,courier_id,delivery_status,assigned_at,out_for_delivery_at,delivered_at,failed_at,
      receiver_name,pod_note,failed_reason,assigned_by,updated_at)
    VALUES(?,NULL,'unassigned',NULL,NULL,NULL,NULL,'','','','System Administrator',?)`).run(orderId,createdAt||nowIso());
  deliveryEvent(orderId,'delivery.created',null,'unassigned',{details:{automatic:true}});
}
function deliveryForOrder(orderId){
  const delivery=db.prepare(`SELECT od.*,c.name_ar courier_name_ar,c.name_en courier_name_en,c.phone courier_phone,
      c.vehicle courier_vehicle,c.plate courier_plate,c.zone courier_zone,c.active courier_active
    FROM order_deliveries od LEFT JOIN couriers c ON c.id=od.courier_id WHERE od.order_id=?`).get(orderId);
  if(!delivery) return null;
  const events=db.prepare(`SELECT id,event_type,from_value,to_value,actor,details_json,created_at
    FROM delivery_events WHERE order_id=? ORDER BY id`).all(orderId).map(e=>{
      let details={};try{details=JSON.parse(e.details_json||'{}')}catch{}
      return {...e,details};
    });
  return {...delivery,courier_active:delivery.courier_active===null?null:Boolean(delivery.courier_active),events};
}
function listCouriers(){
  return db.prepare(`SELECT c.*,
      SUM(CASE WHEN od.delivery_status IN ('assigned','out_for_delivery') THEN 1 ELSE 0 END) active_deliveries,
      SUM(CASE WHEN od.delivery_status='out_for_delivery' THEN 1 ELSE 0 END) out_for_delivery,
      SUM(CASE WHEN od.delivery_status='delivered' THEN 1 ELSE 0 END) delivered_orders,
      SUM(CASE WHEN od.delivery_status='failed' THEN 1 ELSE 0 END) failed_orders
    FROM couriers c
    LEFT JOIN order_deliveries od ON od.courier_id=c.id
    GROUP BY c.id ORDER BY c.active DESC,c.name_en`).all().map(r=>({...r,active:Boolean(r.active)}));
}
function deliverySummary(){
  const row=db.prepare(`SELECT COUNT(*) total,
      SUM(CASE WHEN delivery_status='unassigned' THEN 1 ELSE 0 END) unassigned,
      SUM(CASE WHEN delivery_status='assigned' THEN 1 ELSE 0 END) assigned,
      SUM(CASE WHEN delivery_status='out_for_delivery' THEN 1 ELSE 0 END) out_for_delivery,
      SUM(CASE WHEN delivery_status='delivered' THEN 1 ELSE 0 END) delivered,
      SUM(CASE WHEN delivery_status='failed' THEN 1 ELSE 0 END) failed
    FROM order_deliveries`).get();
  return {...row,couriers:listCouriers()};
}
function recordCodOnDelivery(order,actor='System Administrator'){
  if(String(order.payment_method||'').toLowerCase()!=='cod') return null;
  const agg=db.prepare('SELECT COALESCE(SUM(amount),0) paid FROM finance_payments WHERE order_id=?').get(order.id);
  const paid=Math.max(0,Number(agg?.paid||0));
  const total=Math.max(0,Number(order.total||0));
  const outstanding=Math.max(0,total-paid);
  if(outstanding<=0) return null;
  const id=`PAY-COD-${order.id}-${Date.now()}`;
  const reference=`COD-${order.id}`;
  const created=nowIso();
  db.prepare(`INSERT INTO finance_payments(id,order_id,amount,method,reference,note,actor,created_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(id,order.id,outstanding,'cod',reference,'Automatically collected on delivery',actor,created);
  db.prepare(`INSERT INTO finance_events(event_type,entity_type,entity_id,order_id,actor,details_json,created_at)
    VALUES(?,?,?,?,?,?,?)`).run('payment.recorded','payment',id,order.id,actor,JSON.stringify({amount:outstanding,method:'cod',reference,source:'delivery'}),created);
  return {id,amount:outstanding,reference};
}


function reconcileOrderStatusFromWorkflow(row){
  if(!row) return row;
  if(['delivery','completed','cancelled'].includes(row.status)) return row;

  ensureOrderOperation(row.id,row.created_at||nowIso());
  const op=db.prepare('SELECT veterinary_status,slaughter_status,preparation_status FROM order_operations WHERE order_id=?').get(row.id);
  if(!op) return row;

  let desired=row.status;

  if(op.preparation_status==='ready' && ['received','confirmed','preparing'].includes(desired)){
    desired='ready';
  }else if(
    (op.slaughter_status==='in_progress' || op.slaughter_status==='completed' || op.preparation_status==='in_progress') &&
    ['received','confirmed'].includes(desired)
  ){
    desired='preparing';
  }

  if(desired===row.status) return row;

  const now=nowIso();
  db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(desired,now,row.id);
  db.prepare('INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)')
    .run(row.id,'workflow.reconciled',row.status,desired,now);

  return {...row,status:desired,updated_at:now};
}

function orderWithItems(row){
  if(!row) return null;
  row=reconcileOrderStatusFromWorkflow(row);
  const items=db.prepare('SELECT product_id,name_ar,name_en,qty,unit_price,cut,pack,fat FROM order_items WHERE order_id=? ORDER BY id').all(row.id);
  const events=db.prepare('SELECT event_type,from_status,to_status,created_at FROM order_events WHERE order_id=? ORDER BY id').all(row.id);
  const operation=operationForOrder(row.id);
  ensureOrderDelivery(row.id,row.created_at||nowIso());
  const delivery=deliveryForOrder(row.id);
  const media=mediaForOrder(row.id);
  const customer=row.customer_id?db.prepare('SELECT id,name,email,phone,provider FROM customer_accounts WHERE id=?').get(row.customer_id):null;
  return {...row,items,events,operation,delivery,media,customer:customer||null};
}
function listOrders(where='',params=[]){
  const rows=db.prepare(`SELECT * FROM orders ${where} ORDER BY datetime(created_at) DESC`).all(...params);
  return rows.map(orderWithItems);
}
function redactOrderFinance(order,user){
  if(!order) return order;
  if(adminPermission(user,'finance').view) return order;
  const clean={...order};
  delete clean.subtotal;
  delete clean.delivery_fee;
  delete clean.total;
  delete clean.payment_method;
  clean.items=(clean.items||[]).map(item=>{
    const x={...item};
    delete x.unit_price;
    return x;
  });
  clean.finance_redacted=true;
  return clean;
}
function makeOrderId(){return 'KN-'+new Date().toISOString().slice(2,10).replace(/-/g,'')+'-'+crypto.randomInt(1000,9999)}
function makeOrderCode(){
  const day=new Date().toISOString().slice(0,10).replace(/-/g,'');
  for(let i=0;i<30;i++){
    const code=`KBJ-${day}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    if(!db.prepare('SELECT id FROM orders WHERE order_code=?').get(code))return code;
  }
  return `KBJ-${day}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
}

function financeMethodKey(value='cod'){
  const m=String(value||'cod').toLowerCase();
  if(m.includes('card')) return 'card';
  if(m.includes('bank')) return 'bank';
  if(m.includes('wallet')) return 'wallet';
  if(m.includes('cash')) return 'cod';
  return ['cod','card','bank','wallet'].includes(m)?m:'cod';
}
function financeOrderLedger(){
  const orders=db.prepare('SELECT * FROM orders ORDER BY datetime(created_at) DESC').all();
  const paymentRows=db.prepare(`SELECT order_id,COALESCE(SUM(amount),0) paid_amount,MAX(datetime(created_at)) last_payment_at
    FROM finance_payments GROUP BY order_id`).all();
  const paymentMap=new Map(paymentRows.map(x=>[x.order_id,x]));
  const lastPaymentStmt=db.prepare('SELECT method,reference,note,created_at FROM finance_payments WHERE order_id=? ORDER BY datetime(created_at) DESC,id DESC LIMIT 1');

  return orders.map(o=>{
    const agg=paymentMap.get(o.id)||{paid_amount:0,last_payment_at:null};
    const last=lastPaymentStmt.get(o.id)||null;
    const total=Number(o.total||0);
    const paid=Math.max(0,Math.min(total,Number(agg.paid_amount||0)));
    const outstanding=Math.max(0,total-paid);
    const status=o.status==='cancelled'?'cancelled':paid<=0?'due':outstanding<=0?'collected':'partial';
    return {
      id:`INV-${o.id}`,
      order_id:o.id,
      customer:o.customer_name,
      phone:o.phone,
      total,
      paid,
      outstanding,
      method:last?.method||o.payment_method||'cod',
      status,
      order_status:o.status,
      reference:last?.reference||'',
      note:last?.note||'',
      created_at:o.created_at,
      updated_at:last?.created_at||o.updated_at
    };
  });
}
function financeSummary(){
  const ledger=financeOrderLedger();
  const gross=ledger.reduce((s,r)=>s+Number(r.total||0),0);
  const collected=ledger.reduce((s,r)=>s+Number(r.paid||0),0);
  const outstanding=ledger.reduce((s,r)=>s+Number(r.outstanding||0),0);
  const cod=ledger.filter(r=>financeMethodKey(r.method)==='cod').reduce((s,r)=>s+Number(r.paid||0),0);
  const settlements=db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) pending_amount,
      COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END),0) completed_amount,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending_count,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) completed_count
    FROM finance_settlements`).get();
  return {
    gross,
    collected,
    outstanding,
    cod,
    collection_rate:gross?Math.round((collected/gross)*100):0,
    open_invoices:ledger.filter(r=>r.outstanding>0&&r.status!=='cancelled').length,
    pending_settlement_amount:Number(settlements.pending_amount||0),
    completed_settlement_amount:Number(settlements.completed_amount||0),
    pending_settlement_count:Number(settlements.pending_count||0),
    completed_settlement_count:Number(settlements.completed_count||0)
  };
}
function financeSettlementsList(){
  return db.prepare('SELECT * FROM finance_settlements ORDER BY datetime(created_at) DESC,id DESC').all();
}
function financeEvent(eventType,entityType,entityId,{orderId=null,actor='System Administrator',details={}}={}){
  db.prepare(`INSERT INTO finance_events(event_type,entity_type,entity_id,order_id,actor,details_json,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(eventType,entityType,entityId,orderId,actor,JSON.stringify(details||{}),nowIso());
}



const GOVERNANCE_ROLES=['owner','ops','finance','slaughterhouse','compliance','marketing'];
const GOVERNANCE_SCOPES=['all','north','central','east'];
const GOVERNANCE_OTP_MODES=['email','sms','both','pending'];
const GOVERNANCE_MODULES=['dashboard','suppliers','orders','delivery','finance','ai','whatsapp','marketing','users','audit'];

function normalizeAdminOtpMode(value,legacy='pending'){
  const mode=String(value||'').toLowerCase();
  if(GOVERNANCE_OTP_MODES.includes(mode))return mode;
  if(String(legacy||'')==='fido2')return 'both';
  if(String(legacy||'')==='totp')return 'email';
  return 'pending';
}
function legacyMfaForOtpMode(mode){
  const normalized=normalizeAdminOtpMode(mode);
  if(normalized==='both')return 'fido2';
  if(normalized==='email'||normalized==='sms')return 'totp';
  return 'pending';
}

function governanceEvent(eventType,entityType,entityId,{actor='System Administrator',fromValue=null,toValue=null,details={}}={}){
  db.prepare(`INSERT INTO governance_events(event_type,entity_type,entity_id,actor,from_value,to_value,details_json,created_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(
      String(eventType),String(entityType),String(entityId),String(actor||'System Administrator'),
      fromValue===undefined?null:fromValue,toValue===undefined?null:toValue,
      JSON.stringify(details||{}),nowIso()
    );
}
function governanceUserRow(row){
  if(!row) return null;
  const otpMode=normalizeAdminOtpMode(row.otp_mode,row.mfa);
  return {
    id:row.id,nameAr:row.name_ar,nameEn:row.name_en,email:row.email,phone:row.phone,
    role:row.role,scope:row.scope,mfa:otpMode,otpMode,
    emailVerified:Boolean(row.email_verified),phoneVerified:Boolean(row.phone_verified),
    last2faAt:row.last_2fa_at||null,lastLogin:row.last_login,
    sessionAr:row.session_ar,sessionEn:row.session_en,device:row.device,status:row.status,
    created_at:row.created_at,updated_at:row.updated_at
  };
}
function governanceApprovalRow(row){
  if(!row) return null;
  return {
    id:row.id,titleAr:row.title_ar,titleEn:row.title_en,requestedBy:row.requested_by,
    risk:row.risk,status:row.status,requested_at:row.requested_at,
    reviewed_at:row.reviewed_at,reviewed_by:row.reviewed_by
  };
}
function governanceUsers(){
  return db.prepare('SELECT * FROM admin_users ORDER BY CASE status WHEN ? THEN 0 ELSE 1 END,id')
    .all('active').map(governanceUserRow);
}
function governanceApprovals(){
  return db.prepare(`SELECT * FROM governance_approvals
    ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,
             CASE risk WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
             datetime(requested_at) DESC,id`).all().map(governanceApprovalRow);
}
function governancePermissions(){
  const rows=db.prepare('SELECT role,module,can_view,can_manage FROM role_permissions ORDER BY role,module').all();
  const matrix={};
  for(const role of GOVERNANCE_ROLES) matrix[role]={};
  for(const r of rows) matrix[r.role][r.module]={view:Boolean(r.can_view),manage:Boolean(r.can_manage)};
  return matrix;
}
function governanceSummary(){
  const u=db.prepare(`SELECT COUNT(*) total,
      SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) active,
      SUM(CASE WHEN COALESCE(NULLIF(otp_mode,''),'pending')<>'pending' THEN 1 ELSE 0 END) mfa_active,
      COUNT(DISTINCT role) roles
    FROM admin_users`).get();
  const a=db.prepare(`SELECT
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending,
      SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) approved,
      SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) rejected
    FROM governance_approvals`).get();
  const audit=Number(db.prepare(`SELECT COUNT(*) n FROM audit_events WHERE category='security'`).get()?.n||0);
  const total=Number(u?.total||0);
  return {
    total_users:total,
    active_users:Number(u?.active||0),
    mfa_active:Number(u?.mfa_active||0),
    mfa_coverage:total?Math.round(Number(u?.mfa_active||0)/total*100):0,
    contextual_roles:Number(u?.roles||0),
    pending_approvals:Number(a?.pending||0),
    approved_approvals:Number(a?.approved||0),
    rejected_approvals:Number(a?.rejected||0),
    security_audit_events:audit
  };
}
function governanceSnapshot(){
  return {
    users:governanceUsers(),
    approvals:governanceApprovals(),
    permissions:governancePermissions(),
    summary:governanceSummary(),
    roles:GOVERNANCE_ROLES,
    scopes:GOVERNANCE_SCOPES,
    modules:GOVERNANCE_MODULES,
    otp_modes:GOVERNANCE_OTP_MODES,
    otp_providers:otpProviderStatus()
  };
}
function nextGovernanceId(prefix,table){
  const rows=db.prepare(`SELECT id FROM ${table} WHERE id LIKE ?`).all(`${prefix}%`);
  const max=rows.reduce((m,r)=>Math.max(m,Number(String(r.id).split('-').pop())||0),0);
  return `${prefix}${String(max+1).padStart(3,'0')}`;
}
function activeOwnerCount(){
  return Number(db.prepare(`SELECT COUNT(*) n FROM admin_users WHERE role='owner' AND status='active'`).get()?.n||0);
}

function adminUserFromRequest(req){
  const session=adminSessionFromRequest(req);
  if(!session)return null;
  return db.prepare('SELECT * FROM admin_users WHERE id=?').get(session.admin_id)||null;
}
function adminActorName(user){
  return user?.name_en||user?.name_ar||user?.id||'System Administrator';
}
function adminPermission(user,module){
  if(!user||!module) return {view:false,manage:false};
  const row=db.prepare('SELECT can_view,can_manage FROM role_permissions WHERE role=? AND module=?').get(user.role,module);
  return {view:Boolean(row?.can_view),manage:Boolean(row?.can_manage)};
}
function rbacRequirement(pathname,method){
  const manage=method!=='GET'&&method!=='HEAD';
  if(pathname==='/api/admin/session'||pathname.startsWith('/api/admin/security')) return null;
  if(pathname.startsWith('/api/admin/audit')) return {module:'audit',access:'view'};
  if(pathname.startsWith('/api/admin/governance')) return {module:'users',access:manage?'manage':'view'};
  if(pathname.startsWith('/api/admin/finance')) return {module:'finance',access:manage?'manage':'view'};
  if(pathname.startsWith('/api/admin/ai')) return {module:'ai',access:manage?'manage':'view'};
  if(pathname.startsWith('/api/admin/whatsapp')) return {module:'whatsapp',access:manage?'manage':'view'};
  if(pathname.startsWith('/api/admin/marketing')) return {module:'marketing',access:manage?'manage':'view'};
  if(pathname.startsWith('/api/admin/suppliers')) return {module:'suppliers',access:manage?'manage':'view'};
  if(/^\/api\/admin\/orders\/[^/]+\/delivery$/.test(pathname)||pathname.startsWith('/api/admin/couriers')){
    return {module:'delivery',access:manage?'manage':'view'};
  }
  if(pathname==='/api/admin/stats') return {module:'dashboard',access:'view'};
  if(pathname.startsWith('/api/admin/orders')||pathname.startsWith('/api/admin/slaughterhouses')){
    return {module:'orders',access:manage?'manage':'view'};
  }
  return {module:'dashboard',access:manage?'manage':'view'};
}
function recordRbacDenied(req,user,pathname,requirement,reason){
  try{
    governanceEvent('rbac.access.denied','route',pathname,{
      actor:adminActorName(user),
      fromValue:user?.role||'unknown',
      toValue:'denied',
      details:{
        method:req.method,
        module:requirement?.module||null,
        access:requirement?.access||null,
        role:user?.role||null,
        scope:user?.scope||null,
        user_id:user?.id||'unknown',
        reason
      }
    });
  }catch{}
}
function enforceAdminRbac(req,res,pathname){
  const user=adminUserFromRequest(req);
  const requirement=rbacRequirement(pathname,req.method);
  if(!user){
    recordRbacDenied(req,null,pathname,requirement,'unknown_admin_user');
    json(res,403,{error:'Administrative user not found',code:'RBAC_USER_NOT_FOUND'});
    return null;
  }
  if(user.status!=='active'){
    recordRbacDenied(req,user,pathname,requirement,'account_suspended');
    json(res,403,{error:'Administrative account is suspended',code:'RBAC_ACCOUNT_SUSPENDED',user_id:user.id});
    return null;
  }
  if(!requirement) return {user,permission:{view:true,manage:true},requirement:null};
  const permission=adminPermission(user,requirement.module);
  const allowed=requirement.access==='manage'?permission.manage:permission.view;
  if(!allowed){
    recordRbacDenied(req,user,pathname,requirement,'permission_denied');
    json(res,403,{
      error:'Access denied by RBAC policy',
      code:'RBAC_FORBIDDEN',
      module:requirement.module,
      required:requirement.access,
      role:user.role,
      user_id:user.id
    });
    return null;
  }
  return {user,permission,requirement};
}
function adminSessionSnapshot(user){
  const permissions={};
  for(const module of GOVERNANCE_MODULES) permissions[module]=adminPermission(user,module);
  return {
    user:governanceUserRow(user),
    permissions,
    modules:GOVERNANCE_MODULES,
    default_user_id:DEFAULT_ADMIN_USER_ID
  };
}

function adminCurrentSessionHash(req){
  const token=parseCookies(req).kn_admin_session||'';
  return token?adminTokenHash(token):'';
}
function adminSecuritySessions(req,adminId){
  const currentHash=adminCurrentSessionHash(req);
  return db.prepare(`SELECT token_hash,created_at,last_seen_at,expires_at,ip_address,user_agent
      FROM admin_sessions WHERE admin_id=? AND datetime(expires_at)>datetime(?)
      ORDER BY datetime(last_seen_at) DESC`).all(adminId,nowIso()).map(row=>({
        id:String(row.token_hash).slice(0,16),
        current:row.token_hash===currentHash,
        createdAt:row.created_at,
        lastSeenAt:row.last_seen_at,
        expiresAt:row.expires_at,
        ip:row.ip_address||'',
        userAgent:row.user_agent||''
      }));
}
function adminSecuritySnapshot(req,user){
  const otpMode=normalizeAdminOtpMode(user?.otp_mode,user?.mfa);
  return {
    account:{
      id:user?.id||'',
      nameAr:user?.name_ar||'',
      nameEn:user?.name_en||'',
      email:user?.email||'',
      phone:user?.phone||'',
      otpMode,
      emailVerified:Boolean(user?.email_verified),
      phoneVerified:Boolean(user?.phone_verified),
      last2faAt:user?.last_2fa_at||null,
      lastLogin:user?.last_login||null,
      passwordUpdatedAt:user?.password_updated_at||null
    },
    providers:otpProviderStatus(),
    sessions:adminSecuritySessions(req,user?.id||'')
  };
}
function adminSecurityChallengeRow(adminId,challengeId){
  return db.prepare(`SELECT * FROM admin_security_challenges WHERE id=? AND admin_id=?`).get(challengeId,adminId)||null;
}
function adminSecurityChallengeExpired(row){
  const expires=Date.parse(String(row?.expires_at||''));
  return !Number.isFinite(expires)||expires<=Date.now();
}
async function deliverSecurityContactOtp(purpose,value,otp){
  if(purpose==='email_change'){
    await sendOtpEmail({email:value},otp);
    return {channel:'email',masked:maskEmail(value)};
  }
  if(purpose==='phone_change'){
    await sendOtpSms({phone:value},otp);
    return {channel:'sms',masked:maskPhone(value)};
  }
  throw new Error('Unsupported security verification purpose');
}

function auditRow(row){
  if(!row) return null;
  let details={};
  try{details=JSON.parse(row.details_json||'{}')}catch{}
  return {...row,details};
}
function auditFiltersFromUrl(url){
  const q=String(url.searchParams.get('q')||'').trim();
  const category=String(url.searchParams.get('category')||'all').trim();
  const severity=String(url.searchParams.get('severity')||'all').trim();
  const actor=String(url.searchParams.get('actor')||'all').trim();
  const orderId=String(url.searchParams.get('order_id')||'').trim();
  const limit=Math.max(1,Math.min(1000,Number(url.searchParams.get('limit')||500)||500));
  const offset=Math.max(0,Number(url.searchParams.get('offset')||0)||0);
  return {q,category,severity,actor,orderId,limit,offset};
}
function auditWhere(filters){
  const clauses=[];const params=[];
  if(filters.category!=='all'){
    clauses.push('category=?');params.push(filters.category);
  }
  if(filters.severity!=='all'){
    clauses.push('severity=?');params.push(filters.severity);
  }
  if(filters.actor!=='all'){
    clauses.push('actor=?');params.push(filters.actor);
  }
  if(filters.orderId){
    clauses.push('order_id=?');params.push(filters.orderId);
  }
  if(filters.q){
    const like=`%${filters.q}%`;
    clauses.push(`(
      event_type LIKE ? OR actor LIKE ? OR resource_type LIKE ? OR resource_id LIKE ? OR
      COALESCE(order_id,'') LIKE ? OR action LIKE ? OR COALESCE(from_value,'') LIKE ? OR
      COALESCE(to_value,'') LIKE ? OR details_json LIKE ?
    )`);
    params.push(like,like,like,like,like,like,like,like,like);
  }
  return {sql:clauses.length?`WHERE ${clauses.join(' AND ')}`:'',params};
}
function auditSnapshot(filters={q:'',category:'all',severity:'all',actor:'all',orderId:'',limit:500,offset:0}){
  const where=auditWhere(filters);
  const total=Number(db.prepare(`SELECT COUNT(*) total FROM audit_events ${where.sql}`).get(...where.params)?.total||0);
  const events=db.prepare(`SELECT * FROM audit_events ${where.sql} ORDER BY datetime(created_at) DESC,id DESC LIMIT ? OFFSET ?`)
    .all(...where.params,filters.limit,filters.offset).map(auditRow);
  const stats=db.prepare(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN severity='high' THEN 1 ELSE 0 END) high_severity,
      SUM(CASE WHEN severity='medium' THEN 1 ELSE 0 END) medium_severity,
      SUM(CASE WHEN category='orders' THEN 1 ELSE 0 END) order_events,
      SUM(CASE WHEN category='finance' THEN 1 ELSE 0 END) finance_events,
      SUM(CASE WHEN category='communications' THEN 1 ELSE 0 END) communication_events
    FROM audit_events`).get();
  const actors=db.prepare(`SELECT DISTINCT actor FROM audit_events WHERE actor<>'' ORDER BY actor`).all().map(x=>x.actor);
  return {
    events,total,limit:filters.limit,offset:filters.offset,
    stats:{
      total:Number(stats?.total||0),
      high_severity:Number(stats?.high_severity||0),
      medium_severity:Number(stats?.medium_severity||0),
      order_events:Number(stats?.order_events||0),
      finance_events:Number(stats?.finance_events||0),
      communication_events:Number(stats?.communication_events||0)
    },
    actors,
    append_only:true
  };
}


const aiService=createKabshAiService({
  catalog,
  getOrderById:async(id)=>{
    const row=db.prepare('SELECT * FROM orders WHERE id=?').get(String(id||'').trim());
    return row?orderWithItems(row):null;
  },
  getLatestOrderByPhone:async(phone)=>{
    const local=normalizePhone(phone);
    if(!local) return null;
    const row=db.prepare('SELECT * FROM orders WHERE phone=? ORDER BY datetime(created_at) DESC LIMIT 1').get(local);
    return row?orderWithItems(row):null;
  },
  getCustomerOrders:async(phone)=>{
    const local=normalizePhone(phone);
    if(!local) return [];
    return listOrders('WHERE phone=?',[local]);
  }
});

function aiPublicHealth(){
  return {
    enabled:true,
    engine:'kabsh-grounded',
    external_provider_configured:Boolean(env('OPENAI_API_KEY')||env('GEMINI_API_KEY')),
    website_chat_ready:true,
    whatsapp_reply_ready:true
  };
}

function getWaSettings(){return db.prepare('SELECT * FROM whatsapp_settings WHERE id=1').get()}
function publicWaSettings(){
  const s=getWaSettings();
  return {
    phone_number_id:s.phone_number_id,
    waba_id:s.waba_id,
    display_phone_number:s.display_phone_number,
    graph_version:s.graph_version,
    enabled:Boolean(s.enabled),
    token_configured:Boolean(env('WHATSAPP_ACCESS_TOKEN')),
    app_secret_configured:Boolean(env('META_APP_SECRET')),
    webhook_verify_token_configured:Boolean(env('WHATSAPP_VERIFY_TOKEN')),
    configured:Boolean(s.enabled&&s.phone_number_id&&s.graph_version&&env('WHATSAPP_ACCESS_TOKEN')),
    updated_at:s.updated_at
  };
}
function waConfig(){
  const s=getWaSettings();
  return {...s,access_token:env('WHATSAPP_ACCESS_TOKEN'),verify_token:env('WHATSAPP_VERIFY_TOKEN'),app_secret:env('META_APP_SECRET')};
}
function waBroadcast(type,payload){
  const packet=`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for(const res of [...waStreamClients]){
    try{res.write(packet)}catch{waStreamClients.delete(res)}
  }
}
function waOrderForPhone(waPhone){
  const local=fromWaPhone(waPhone);
  return db.prepare('SELECT * FROM orders WHERE phone=? ORDER BY datetime(created_at) DESC LIMIT 1').get(local)||null;
}
function saveWaMessage({id,phone,direction,message_type='text',bodyText='',status='received',order_id=null,wa_timestamp='',raw_json=''}){
  const msgId=String(id||`local-${crypto.randomUUID()}`);
  db.prepare(`INSERT INTO whatsapp_messages(id,phone,direction,message_type,body,status,order_id,wa_timestamp,created_at,raw_json)
    VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET status=excluded.status,body=CASE WHEN excluded.body<>'' THEN excluded.body ELSE whatsapp_messages.body END,raw_json=excluded.raw_json`).run(
      msgId,String(phone||''),direction,message_type,String(bodyText||''),status,order_id||null,String(wa_timestamp||''),nowIso(),String(raw_json||'')
    );
  return db.prepare('SELECT * FROM whatsapp_messages WHERE id=?').get(msgId);
}
function verifyWebhookSignature(raw,signature){
  const secret=env('META_APP_SECRET');
  if(!secret) return {ok:true,skipped:true};
  if(!signature||!signature.startsWith('sha256=')) return {ok:false,skipped:false};
  const expected='sha256='+crypto.createHmac('sha256',secret).update(raw).digest('hex');
  const a=Buffer.from(expected);const b=Buffer.from(String(signature));
  return {ok:a.length===b.length&&crypto.timingSafeEqual(a,b),skipped:false};
}
async function sendWhatsAppText(phone,textValue,orderId=''){
  const cfg=waConfig();
  const to=toWaPhone(phone);
  if(!to) throw new Error('Valid Saudi WhatsApp mobile number required');
  if(!cfg.enabled) throw new Error('WhatsApp integration is disabled in settings');
  if(!cfg.phone_number_id) throw new Error('WhatsApp Phone Number ID is not configured');
  if(!cfg.graph_version) throw new Error('WhatsApp Graph API version is not configured');
  if(!cfg.access_token) throw new Error('WHATSAPP_ACCESS_TOKEN is missing from .env');
  const message=String(textValue||'').trim();
  if(!message) throw new Error('Message text is required');
  if(message.length>4096) throw new Error('Message is too long');

  const url=`${WA_API_BASE}/${encodeURIComponent(cfg.graph_version)}/${encodeURIComponent(cfg.phone_number_id)}/messages`;
  const response=await fetch(url,{
    method:'POST',
    headers:{'Authorization':`Bearer ${cfg.access_token}`,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to,type:'text',text:{preview_url:false,body:message}})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const failed=saveWaMessage({id:`failed-${crypto.randomUUID()}`,phone:to,direction:'out',bodyText:message,status:'failed',order_id:orderId||waOrderForPhone(to)?.id||null,raw_json:JSON.stringify(data)});
    waBroadcast('message.failed',{message:failed,error:data?.error?.message||`WhatsApp API HTTP ${response.status}`});
    throw new Error(data?.error?.message||`WhatsApp API HTTP ${response.status}`);
  }
  const wamid=data?.messages?.[0]?.id||`sent-${crypto.randomUUID()}`;
  const saved=saveWaMessage({id:wamid,phone:to,direction:'out',bodyText:message,status:'sent',order_id:orderId||waOrderForPhone(to)?.id||null,raw_json:JSON.stringify(data)});
  waBroadcast('message.sent',{message:saved});
  return {message:saved,provider:data};
}
function waConversations(){
  const rows=db.prepare(`SELECT phone,MAX(created_at) last_message_at,COUNT(*) message_count FROM whatsapp_messages GROUP BY phone ORDER BY datetime(last_message_at) DESC`).all();
  return rows.map(r=>{
    const last=db.prepare('SELECT * FROM whatsapp_messages WHERE phone=? ORDER BY datetime(created_at) DESC LIMIT 1').get(r.phone);
    const order=waOrderForPhone(r.phone);
    return {...r,last_message:last||null,order:order?orderWithItems(order):null};
  });
}
function rememberWebhook(raw,eventType='webhook'){
  const id=crypto.createHash('sha256').update(raw).digest('hex');
  const exists=db.prepare('SELECT id FROM whatsapp_webhook_events WHERE id=?').get(id);
  if(exists) return false;
  db.prepare('INSERT INTO whatsapp_webhook_events(id,event_type,created_at,raw_json) VALUES(?,?,?,?)').run(id,eventType,nowIso(),raw);
  return true;
}
function processWhatsAppWebhook(payload,raw){
  if(!rememberWebhook(raw,'whatsapp.webhook')) return {duplicate:true,messages:0,statuses:0};
  let messages=0,statuses=0;
  for(const entry of payload?.entry||[]){
    for(const change of entry?.changes||[]){
      const value=change?.value||{};
      for(const msg of value.messages||[]){
        const from=String(msg.from||'');
        const order=waOrderForPhone(from);
        let messageText='';
        if(msg.type==='text') messageText=msg.text?.body||'';
        else if(msg.type==='button') messageText=msg.button?.text||'';
        else if(msg.type==='interactive') messageText=msg.interactive?.button_reply?.title||msg.interactive?.list_reply?.title||'';
        else messageText=`[${msg.type||'message'}]`;
        const saved=saveWaMessage({
          id:msg.id||`in-${crypto.randomUUID()}`,
          phone:from,
          direction:'in',
          message_type:msg.type||'unknown',
          bodyText:messageText,
          status:'received',
          order_id:order?.id||null,
          wa_timestamp:msg.timestamp||'',
          raw_json:JSON.stringify(msg)
        });
        messages++;
        waBroadcast('message.received',{message:saved,order:order?orderWithItems(order):null});
      }
      for(const st of value.statuses||[]){
        const status=String(st.status||'');
        const existing=db.prepare('SELECT * FROM whatsapp_messages WHERE id=?').get(st.id);
        if(existing){
          db.prepare('UPDATE whatsapp_messages SET status=?,raw_json=? WHERE id=?').run(status,JSON.stringify(st),st.id);
          const updated=db.prepare('SELECT * FROM whatsapp_messages WHERE id=?').get(st.id);
          waBroadcast('message.status',{message:updated});
        }
        statuses++;
      }
    }
  }
  return {duplicate:false,messages,statuses};
}

async function handleApi(req,res,url){
  const pathname=url.pathname;

  if(req.method==='POST'&&pathname==='/api/admin/auth/start'){
    try{
      const d=await body(req);
      const adminId=String(d.admin_id||d.adminId||'').trim().toUpperCase();
      const password=String(d.password||'');
      const requestedChannel=String(d.channel||'auto').toLowerCase();
      const ip=adminRequestIp(req);
      const pairKey=`${adminId||'invalid'}|${ip}`;
      const ipGate=authRateStatus('admin-login-ip',ip,ADMIN_PASSWORD_MAX_ATTEMPTS*3);
      const pairGate=authRateStatus('admin-login-pair',pairKey,ADMIN_PASSWORD_MAX_ATTEMPTS);
      const blocked=!ipGate.allowed?ipGate:(!pairGate.allowed?pairGate:null);
      if(blocked){
        adminAuthAudit('admin.auth.password_rate_limited',adminId||'unknown',{ip,retry_after:blocked.retryAfter});
        return json(res,429,{error:'Too many sign-in attempts. Try again later.',code:'ADMIN_PASSWORD_RATE_LIMITED',retry_after:blocked.retryAfter});
      }
      if(!/^ADM-[A-Z0-9-]{3,40}$/.test(adminId)||!password||password.length>256){
        authRateFailure('admin-login-ip',ip,ADMIN_PASSWORD_MAX_ATTEMPTS*3);
        authRateFailure('admin-login-pair',pairKey,ADMIN_PASSWORD_MAX_ATTEMPTS);
        return json(res,401,{error:'Invalid admin ID or password',code:'ADMIN_AUTH_INVALID'});
      }
      const user=db.prepare('SELECT * FROM admin_users WHERE id=?').get(adminId);
      const passwordOk=user?.password_hash
        ?verifyPassword(password,user.password_hash)
        :(verifyPassword(password,DUMMY_PASSWORD_HASH)&&false);
      if(!user||!passwordOk){
        authRateFailure('admin-login-ip',ip,ADMIN_PASSWORD_MAX_ATTEMPTS*3);
        authRateFailure('admin-login-pair',pairKey,ADMIN_PASSWORD_MAX_ATTEMPTS);
        adminAuthAudit('admin.auth.password_failed',adminId,{ip});
        return json(res,401,{error:'Invalid admin ID or password',code:'ADMIN_AUTH_INVALID'});
      }
      authRateClear('admin-login-pair',pairKey);
      if(user.status!=='active'){
        adminAuthAudit('admin.auth.suspended',adminId,{ip});
        return json(res,403,{error:'Administrative account is suspended',code:'RBAC_ACCOUNT_SUSPENDED'});
      }
      if(passwordHashNeedsUpgrade(user.password_hash)){
        const upgraded=hashPassword(password);
        db.prepare('UPDATE admin_users SET password_hash=?,password_updated_at=?,updated_at=? WHERE id=?')
          .run(upgraded,nowIso(),nowIso(),user.id);
        user.password_hash=upgraded;
        adminAuthAudit('admin.auth.password_hash_upgraded',user.id,{ip,algorithm:'bcrypt',cost:BCRYPT_COST});
      }

      const since=new Date(Date.now()-ADMIN_LOGIN_WINDOW_MINUTES*60*1000).toISOString();
      const recent=Number(db.prepare('SELECT COUNT(*) n FROM admin_auth_challenges WHERE admin_id=? AND datetime(created_at)>=datetime(?)').get(adminId,since)?.n||0);
      if(recent>=ADMIN_LOGIN_MAX_CHALLENGES){
        adminAuthAudit('admin.auth.rate_limited',adminId,{ip,recent});
        return json(res,429,{error:'Too many verification requests. Try again later.',code:'ADMIN_AUTH_RATE_LIMITED'});
      }

      const challengeId=`A2F-${crypto.randomUUID()}`;
      const otp=String(crypto.randomInt(0,1_000_000)).padStart(6,'0');
      const configuredOtpMode=normalizeAdminOtpMode(user.otp_mode,user.mfa);
      if(configuredOtpMode==='pending'){
        adminAuthAudit('admin.auth.2fa_not_configured',adminId,{ip});
        return json(res,403,{error:'Two-factor authentication is not configured for this administrative account.',code:'ADMIN_2FA_NOT_CONFIGURED'});
      }
      // The server owns the 2FA policy. A client cannot downgrade the configured
      // channel by asking for a weaker mode.
      const delivery=await deliverAdminOtp(user,otp,configuredOtpMode);
      const created=nowIso();
      const expires=new Date(Date.now()+ADMIN_OTP_MINUTES*60*1000).toISOString();
      db.prepare(`UPDATE admin_auth_challenges SET consumed_at=? WHERE admin_id=? AND consumed_at IS NULL`).run(created,adminId);
      db.prepare(`INSERT INTO admin_auth_challenges(
        id,admin_id,otp_hash,channel,destination_masked,attempts,resend_count,created_at,last_sent_at,expires_at,consumed_at
      ) VALUES(?,?,?,?,?,0,0,?,?,?,NULL)`).run(
        challengeId,adminId,adminOtpHash(challengeId,otp),delivery.channel,delivery.masked.join(' + '),created,created,expires
      );
      setAdminPreauth(res,challengeId,adminId,expires);
      adminAuthAudit('admin.auth.otp_sent',adminId,{ip,channels:delivery.channels});
      return json(res,200,{
        ok:true,
        challenge_id:challengeId,
        expires_in:ADMIN_OTP_MINUTES*60,
        resend_after:ADMIN_OTP_RESEND_SECONDS,
        channels:delivery.channels,
        destination:delivery.masked.join(' + ')
      });
    }catch(e){
      return json(res,503,{error:publicError(e,'Unable to send verification code'),code:'OTP_DELIVERY_FAILED'});
    }
  }

  if(req.method==='POST'&&pathname==='/api/admin/auth/resend'){
    try{
      const d=await body(req);
      const resolved=resolveAdminChallenge(req,d);
      const row=resolved.row;
      if(!row||row.consumed_at||challengeIsExpired(row)){
        clearAdminPreauth(res);
        return json(res,410,{error:'Verification session expired. Sign in again.',code:'OTP_CHALLENGE_EXPIRED'});
      }
      const challengeId=row.id;
      if(Number(row.resend_count||0)>=ADMIN_OTP_MAX_RESENDS)return json(res,429,{error:'Resend limit reached. Sign in again.',code:'OTP_RESEND_LIMIT'});
      const elapsed=Math.floor((Date.now()-Date.parse(row.last_sent_at))/1000);
      if(elapsed<ADMIN_OTP_RESEND_SECONDS)return json(res,429,{error:'Please wait before requesting another code.',code:'OTP_RESEND_COOLDOWN',retry_after:ADMIN_OTP_RESEND_SECONDS-elapsed});
      const user=db.prepare('SELECT * FROM admin_users WHERE id=?').get(row.admin_id);
      if(!user||user.status!=='active')return json(res,403,{error:'Administrative account is unavailable',code:'RBAC_ACCOUNT_SUSPENDED'});
      const otp=String(crypto.randomInt(0,1_000_000)).padStart(6,'0');
      const mode=row.channel==='email+sms'?'both':row.channel;
      const delivery=await deliverAdminOtp(user,otp,mode);
      const now=nowIso();
      const expires=new Date(Date.now()+ADMIN_OTP_MINUTES*60*1000).toISOString();
      db.prepare(`UPDATE admin_auth_challenges SET otp_hash=?,channel=?,destination_masked=?,attempts=0,resend_count=resend_count+1,last_sent_at=?,expires_at=? WHERE id=?`)
        .run(adminOtpHash(challengeId,otp),delivery.channel,delivery.masked.join(' + '),now,expires,challengeId);
      setAdminPreauth(res,challengeId,user.id,expires);
      adminAuthAudit('admin.auth.otp_resent',user.id,{ip:adminRequestIp(req),channels:delivery.channels});
      return json(res,200,{ok:true,expires_in:ADMIN_OTP_MINUTES*60,resend_after:ADMIN_OTP_RESEND_SECONDS,channels:delivery.channels,destination:delivery.masked.join(' + ')});
    }catch(e){return json(res,503,{error:publicError(e,'Unable to resend verification code'),code:'OTP_DELIVERY_FAILED'})}
  }

  if(req.method==='POST'&&pathname==='/api/admin/auth/verify'){
    try{
      const d=await body(req);
      const otp=String(d.otp||'').replace(/\D/g,'');
      const resolved=resolveAdminChallenge(req,d);
      const row=resolved.row;
      if(!row||row.consumed_at||challengeIsExpired(row)){
        clearAdminPreauth(res);
        return json(res,410,{error:'Verification code expired. Sign in again.',code:'OTP_CHALLENGE_EXPIRED'});
      }
      const challengeId=row.id;
      if(Number(row.attempts||0)>=ADMIN_OTP_MAX_ATTEMPTS)return json(res,429,{error:'Too many incorrect codes. Sign in again.',code:'OTP_ATTEMPTS_EXCEEDED'});
      if(!/^\d{6}$/.test(otp)||!safeEqualText(adminOtpHash(challengeId,otp),row.otp_hash)){
        const attempts=Number(row.attempts||0)+1;
        db.prepare('UPDATE admin_auth_challenges SET attempts=? WHERE id=?').run(attempts,challengeId);
        adminAuthAudit('admin.auth.otp_failed',row.admin_id,{ip:adminRequestIp(req),attempts});
        return json(res,401,{error:'Incorrect verification code',code:'OTP_INVALID',attempts_remaining:Math.max(0,ADMIN_OTP_MAX_ATTEMPTS-attempts)});
      }
      const user=db.prepare('SELECT * FROM admin_users WHERE id=?').get(row.admin_id);
      if(!user||user.status!=='active')return json(res,403,{error:'Administrative account is unavailable',code:'RBAC_ACCOUNT_SUSPENDED'});
      const verified=nowIso();
      db.prepare('UPDATE admin_auth_challenges SET consumed_at=? WHERE id=?').run(verified,challengeId);
      const sessionExpires=setAdminSession(req,res,user.id);
      clearAdminPreauth(res);
      const verifiedChannels=String(row.channel||'').split('+').filter(Boolean);
      db.prepare(`UPDATE admin_users SET
          last_login=?,last_2fa_at=?,
          email_verified=CASE WHEN ? THEN 1 ELSE email_verified END,
          phone_verified=CASE WHEN ? THEN 1 ELSE phone_verified END,
          updated_at=?
        WHERE id=?`).run(
          verified,verified,
          verifiedChannels.includes('email')?1:0,
          verifiedChannels.includes('sms')?1:0,
          verified,user.id
        );
      adminAuthAudit('admin.auth.login_success',user.id,{ip:adminRequestIp(req),channels:verifiedChannels});
      return json(res,200,{ok:true,authenticated:true,session_expires_at:sessionExpires,...adminSessionSnapshot(user)});
    }catch(e){return json(res,400,{error:publicError(e,'Unable to verify code')})}
  }

  if(req.method==='POST'&&pathname==='/api/admin/auth/logout'){
    const session=adminSessionFromRequest(req);
    if(session)adminAuthAudit('admin.auth.logout',session.admin_id,{ip:adminRequestIp(req)});
    clearAdminSession(req,res);
    clearAdminPreauth(res);
    return json(res,200,{ok:true});
  }

  if(req.method==='GET'&&pathname==='/api/whatsapp/webhook'){
    const mode=url.searchParams.get('hub.mode');
    const token=url.searchParams.get('hub.verify_token');
    const challenge=url.searchParams.get('hub.challenge');
    const expected=env('WHATSAPP_VERIFY_TOKEN');
    if(mode==='subscribe'&&expected&&token===expected) return text(res,200,challenge||'');
    return text(res,403,'Webhook verification failed');
  }
  if(req.method==='POST'&&pathname==='/api/whatsapp/webhook'){
    try{
      const raw=await rawBody(req,2_000_000);
      const check=verifyWebhookSignature(raw,String(req.headers['x-hub-signature-256']||''));
      if(!check.ok) return json(res,401,{error:'Invalid webhook signature'});
      const payload=raw?JSON.parse(raw):{};
      const result=processWhatsAppWebhook(payload,raw);
      return json(res,200,{ok:true,...result,signature_verified:!check.skipped});
    }catch(e){return json(res,400,{error:publicError(e,'Invalid webhook payload')})}
  }

  if(req.method==='POST'&&pathname==='/api/ai/chat'){
    try{
      const d=await body(req);
      const message=String(d.message||'').trim();
      if(!message) return json(res,400,{error:'Message is required'});
      if(message.length>1000) return json(res,400,{error:'Message is too long'});
      const result=await aiService.reply({
        message,
        phone:normalizePhone(d.phone||''),
        orderId:String(d.order_id||d.orderId||'').trim(),
        language:String(d.language||'').trim(),
        channel:String(d.channel||'web').trim()||'web'
      });
      return json(res,200,{ok:true,ai:result});
    }catch(e){
      return json(res,400,{error:publicError(e,'Unable to generate AI reply')});
    }
  }

  if(req.method==='POST'&&pathname==='/api/ai/whatsapp-reply'){
    try{
      if(!adminOk(req)) return json(res,401,{error:'Admin authentication required',code:'ADMIN_AUTH_REQUIRED'});
      const currentAdmin=adminUserFromRequest(req);
      if(!currentAdmin||currentAdmin.status!=='active'){
        recordRbacDenied(req,currentAdmin,pathname,{module:'ai',access:'manage'},currentAdmin?'account_suspended':'unknown_admin_user');
        return json(res,403,{error:currentAdmin?'Administrative account is suspended':'Administrative user not found',code:'RBAC_FORBIDDEN'});
      }
      const aiPerm=adminPermission(currentAdmin,'ai');
      const waPerm=adminPermission(currentAdmin,'whatsapp');
      if(!aiPerm.manage||!waPerm.manage){
        recordRbacDenied(req,currentAdmin,pathname,{module:'ai+whatsapp',access:'manage'},'permission_denied');
        return json(res,403,{error:'Access denied by RBAC policy',code:'RBAC_FORBIDDEN',module:'ai+whatsapp',required:'manage',role:currentAdmin.role,user_id:currentAdmin.id});
      }
      const d=await body(req);
      const phone=normalizePhone(d.phone||'');
      if(!validPhone(phone)) return json(res,400,{error:'Valid Saudi mobile number required'});
      const incoming=String(d.message||'').trim();
      if(!incoming) return json(res,400,{error:'Incoming customer message is required'});
      if(incoming.length>1000) return json(res,400,{error:'Message is too long'});

      const ai=await aiService.reply({
        message:incoming,
        phone,
        orderId:String(d.order_id||d.orderId||'').trim(),
        language:String(d.language||'').trim(),
        channel:'whatsapp'
      });

      let sent=null;
      if(d.send===true){
        if(ai.handoff) return json(res,409,{error:'AI requested human handoff; automatic WhatsApp sending is blocked',ai});
        sent=await sendWhatsAppText(phone,ai.reply,ai.order?.id||d.order_id||'');
      }

      return json(res,200,{ok:true,ai,sent});
    }catch(e){
      return json(res,502,{error:publicError(e,'Unable to generate or send WhatsApp AI reply')});
    }
  }

  if(req.method==='GET'&&pathname==='/api/customer/config'){
    const clientId=env('GOOGLE_CLIENT_ID');
    return json(res,200,{google_enabled:Boolean(clientId),google_client_id:clientId||''});
  }
  if(req.method==='GET'&&pathname==='/api/customer/session'){
    const customer=customerFromRequest(req);
    return json(res,200,{authenticated:Boolean(customer),user:publicCustomer(customer)});
  }
  if(req.method==='POST'&&pathname==='/api/customer/register'){
    try{
      const ip=adminRequestIp(req);
      const registerGate=authRateStatus('customer-register-ip',ip,10,60);
      if(!registerGate.allowed)return json(res,429,{error:'Too many registration attempts. Try again later.',code:'CUSTOMER_REGISTER_RATE_LIMITED',retry_after:registerGate.retryAfter});
      authRateFailure('customer-register-ip',ip,10,60,60);
      const d=await body(req);
      if(captchaRequiredByGate('customer-register-ip',ip,5)){
        const captcha=await verifyCaptchaToken(d.captcha_token,ip);
        if(!captcha.ok)return json(res,403,{error:'CAPTCHA verification required',code:captcha.code});
      }
      const name=String(d.name||'').trim();
      const email=String(d.email||'').trim().toLowerCase();
      const phone=normalizePhone(d.phone||'');
      const password=String(d.password||'');
      if(name.length<2)return json(res,400,{error:'Full name is required'});
      if(!validEmail(email))return json(res,400,{error:'Valid email is required'});
      if(!validPhone(phone))return json(res,400,{error:'Valid Saudi mobile number is required'});
      if(password.length<8||password.length>128)return json(res,400,{error:'Password must be between 8 and 128 characters'});
      if(db.prepare('SELECT id FROM customer_accounts WHERE lower(email)=lower(?)').get(email))return json(res,409,{error:'An account with this email already exists'});
      if(db.prepare(`SELECT id FROM customer_accounts WHERE phone=? AND trim(phone)<>''`).get(phone))return json(res,409,{error:'An account with this mobile number already exists'});
      const id=makeCustomerId(),now=nowIso();
      db.prepare(`INSERT INTO customer_accounts(id,name,email,phone,password_hash,provider,google_sub,status,created_at,updated_at)
        VALUES(?,?,?,?,?,'password',NULL,'active',?,?)`).run(id,name,email,phone,hashCustomerPassword(password),now,now);
      setCustomerSession(res,id);
      return json(res,201,{ok:true,user:publicCustomer(db.prepare('SELECT * FROM customer_accounts WHERE id=?').get(id))});
    }catch(e){return json(res,400,{error:publicError(e,'Unable to create account')})}
  }
  if(req.method==='POST'&&pathname==='/api/customer/login'){
    try{
      const d=await body(req);
      const identifier=String(d.identifier||d.email||'').trim();
      const password=String(d.password||'');
      const ip=adminRequestIp(req);
      const normalizedIdentifier=identifier.includes('@')?identifier.toLowerCase():normalizePhone(identifier);
      const pairKey=`${normalizedIdentifier||'invalid'}|${ip}`;
      const ipGate=authRateStatus('customer-login-ip',ip,CUSTOMER_LOGIN_MAX_ATTEMPTS*3);
      const pairGate=authRateStatus('customer-login-pair',pairKey,CUSTOMER_LOGIN_MAX_ATTEMPTS);
      const blocked=!ipGate.allowed?ipGate:(!pairGate.allowed?pairGate:null);
      if(blocked)return json(res,429,{error:'Too many sign-in attempts. Try again later.',code:'CUSTOMER_LOGIN_RATE_LIMITED',retry_after:blocked.retryAfter});
      if(captchaRequiredByGate('customer-login-pair',pairKey,5)){
        const captcha=await verifyCaptchaToken(d.captcha_token,ip);
        if(!captcha.ok)return json(res,403,{error:'CAPTCHA verification required',code:captcha.code});
      }
      if(!identifier||!password||password.length>256){
        authRateFailure('customer-login-ip',ip,CUSTOMER_LOGIN_MAX_ATTEMPTS*3);
        authRateFailure('customer-login-pair',pairKey,CUSTOMER_LOGIN_MAX_ATTEMPTS);
        return json(res,401,{error:'Incorrect mobile/email or password'});
      }
      let customer=null;
      if(identifier.includes('@')){
        customer=db.prepare(`SELECT * FROM customer_accounts WHERE lower(email)=lower(?) AND status='active'`).get(identifier.toLowerCase());
      }else{
        customer=db.prepare(`SELECT * FROM customer_accounts WHERE phone=? AND status='active'`).get(normalizedIdentifier);
      }
      const passwordOk=customer?.password_hash
        ?verifyCustomerPassword(password,customer.password_hash)
        :(verifyPassword(password,DUMMY_PASSWORD_HASH)&&false);
      if(!customer||!passwordOk){
        authRateFailure('customer-login-ip',ip,CUSTOMER_LOGIN_MAX_ATTEMPTS*3);
        authRateFailure('customer-login-pair',pairKey,CUSTOMER_LOGIN_MAX_ATTEMPTS);
        return json(res,401,{error:'Incorrect mobile/email or password'});
      }
      authRateClear('customer-login-pair',pairKey);
      if(passwordHashNeedsUpgrade(customer.password_hash)){
        const upgraded=hashCustomerPassword(password);
        db.prepare('UPDATE customer_accounts SET password_hash=?,updated_at=? WHERE id=?').run(upgraded,nowIso(),customer.id);
        customer.password_hash=upgraded;
      }
      setCustomerSession(res,customer.id);
      return json(res,200,{ok:true,user:publicCustomer(customer)});
    }catch(e){return json(res,400,{error:publicError(e,'Unable to sign in')})}
  }
  if(req.method==='POST'&&pathname==='/api/customer/google'){
    try{
      const profile=await verifyGoogleCredential((await body(req)).credential);
      let customer=db.prepare('SELECT * FROM customer_accounts WHERE google_sub=? OR lower(email)=lower(?)').get(profile.sub,profile.email);
      const now=nowIso();
      if(customer){
        db.prepare(`UPDATE customer_accounts SET google_sub=?,provider='google',name=CASE WHEN trim(name)='' THEN ? ELSE name END,updated_at=? WHERE id=?`).run(profile.sub,profile.name,now,customer.id);
      }else{
        const id=makeCustomerId();
        db.prepare(`INSERT INTO customer_accounts(id,name,email,phone,password_hash,provider,google_sub,status,created_at,updated_at)
          VALUES(?,?,?,'','','google',?,'active',?,?)`).run(id,profile.name,profile.email,profile.sub,now,now);
        customer=db.prepare('SELECT * FROM customer_accounts WHERE id=?').get(id);
      }
      customer=db.prepare('SELECT * FROM customer_accounts WHERE id=?').get(customer.id);
      setCustomerSession(res,customer.id);
      return json(res,200,{ok:true,user:publicCustomer(customer)});
    }catch(e){return json(res,401,{error:publicError(e,'Google sign-in failed')})}
  }
  if(req.method==='POST'&&pathname==='/api/customer/logout'){
    clearCustomerSession(req,res);
    return json(res,200,{ok:true});
  }
  if(req.method==='PATCH'&&pathname==='/api/customer/profile'){
    const customer=customerFromRequest(req);
    if(!customer)return json(res,401,{error:'Customer login required',code:'CUSTOMER_AUTH_REQUIRED'});
    try{
      const d=await body(req);
      const name=String(d.name??customer.name).trim();
      const phone=normalizePhone(d.phone??customer.phone);
      if(name.length<2)return json(res,400,{error:'Full name is required'});
      if(phone&&!validPhone(phone))return json(res,400,{error:'Valid Saudi mobile number is required'});
      db.prepare('UPDATE customer_accounts SET name=?,phone=?,updated_at=? WHERE id=?').run(name,phone,nowIso(),customer.id);
      return json(res,200,{ok:true,user:publicCustomer(db.prepare('SELECT * FROM customer_accounts WHERE id=?').get(customer.id))});
    }catch(e){return json(res,400,{error:publicError(e,'Unable to update profile')})}
  }

  if(req.method==='GET'&&pathname==='/api/health') return json(res,200,{ok:true,service:'kabsh-najd',database:path.basename(dbPath),whatsapp:publicWaSettings(),ai:aiPublicHealth()});
  if(req.method==='GET'&&pathname==='/api/products'){
    const rows=db.prepare('SELECT id,name_ar,name_en,price,kg,category,image FROM products WHERE active=1 ORDER BY rowid').all();
    return json(res,200,{products:rows});
  }
  if(pathname==='/api/orders'&&req.method==='GET'){
    const customer=customerFromRequest(req);
    if(!customer)return json(res,401,{error:'Customer login required',code:'CUSTOMER_AUTH_REQUIRED'});
    const code=String(url.searchParams.get('code')||'').trim().toUpperCase();
    const orders=code?listOrders('WHERE customer_id=? AND upper(order_code)=?',[customer.id,code]):listOrders('WHERE customer_id=?',[customer.id]);
    return json(res,200,{orders});
  }
  if(pathname==='/api/orders'&&req.method==='POST'){
    const customer=customerFromRequest(req);
    if(!customer)return json(res,401,{error:'Customer login required before placing an order',code:'CUSTOMER_AUTH_REQUIRED'});
    try{
      const d=await body(req);
      const phone=normalizePhone(d.phone||customer.phone);
      const customerName=String(customer.name||d.name||'').trim();
      if(customerName.length<2) return json(res,400,{error:'Customer name is required'});
      if(!validPhone(phone)) return json(res,400,{error:'Valid Saudi mobile number required'});
      if(!validCity(d.city||'Jeddah')) return json(res,400,{error:'Delivery is currently limited to Jeddah'});
      if(!districts.includes(String(d.district||''))) return json(res,400,{error:'Choose a supported Jeddah district'});
      if(!d.address||String(d.address).trim().length<5) return json(res,400,{error:'Delivery address is required'});
      if(!d.deliveryDate||!d.slot) return json(res,400,{error:'Delivery date and time slot are required'});
      if(!Array.isArray(d.items)||!d.items.length) return json(res,400,{error:'Your cart is empty'});

      const cleanItems=[];let subtotal=0;
      const getProduct=db.prepare('SELECT * FROM products WHERE id=? AND active=1');
      for(const item of d.items){
        const p=getProduct.get(String(item.id||''));
        const qty=Number(item.qty);
        if(!p||!Number.isInteger(qty)||qty<1||qty>20) return json(res,400,{error:'Invalid cart item'});
        const pack=['bags','vacuum'].includes(item.pack)?item.pack:'bags';
        const cut=['medium','small','large','quarters','feast'].includes(item.cut)?item.cut:'medium';
        const fat=['trimmed','regular','separate'].includes(item.fat)?item.fat:'regular';
        const head=['cleaned','raw','exclude'].includes(item.head)?item.head:'raw';
        const tripe=['cleaned','exclude'].includes(item.tripe)?item.tripe:'cleaned';
        const unit=Number(p.price)+(pack==='vacuum'?25:0)+(head==='cleaned'?15:0);
        subtotal+=unit*qty;
        cleanItems.push({p,qty,pack,cut,fat,head,tripe,unit});
      }
      const deliveryFee=cleanItems.some(i=>i.p.id==='naimi-selected')?0:DELIVERY_FEE;
      const couponCode=String(d.couponCode||'').trim().toUpperCase();
      const promo=PROMO_CODES[couponCode]||null;
      const discount=promo?Math.round(subtotal*Number(promo.percent||0))/100:0;
      const total=Math.max(0,subtotal+deliveryFee-discount);
      const id=makeOrderId();
      const orderCode=makeOrderCode();
      const now=nowIso();
      db.exec('BEGIN IMMEDIATE');
      try{
        const orderNotes=[String(d.notes||'').trim(),promo?`Coupon ${couponCode}: -${discount.toFixed(2)} SAR (${promo.percent}%)`:'' ].filter(Boolean).join(' | ');
        db.prepare(`INSERT INTO orders(id,customer_id,order_code,customer_name,phone,city,district,address,delivery_date,slot,notes,payment_method,status,subtotal,delivery_fee,total,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,customer.id,orderCode,customerName,phone,'Jeddah',String(d.district),String(d.address).trim(),String(d.deliveryDate),String(d.slot),orderNotes,'cod','received',subtotal,deliveryFee,total,now,now);
        if(customer.phone!==phone)db.prepare('UPDATE customer_accounts SET phone=?,updated_at=? WHERE id=?').run(phone,now,customer.id);
        const addItem=db.prepare('INSERT INTO order_items(order_id,product_id,name_ar,name_en,qty,unit_price,cut,pack,fat) VALUES(?,?,?,?,?,?,?,?,?)');
        for(const i of cleanItems) addItem.run(id,i.p.id,i.p.name_ar,i.p.name_en,i.qty,i.unit,i.cut,i.pack,i.fat);
        db.prepare('INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)').run(id,'order.created',null,'received',now);
        ensureOrderOperation(id,now);
        ensureOrderDelivery(id,now);
        db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e}
      return json(res,201,{ok:true,order:orderWithItems(db.prepare('SELECT * FROM orders WHERE id=?').get(id))});
    }catch(e){return json(res,400,{error:publicError(e,'Unable to create order')})}
  }
  const customerMatch=pathname.match(/^\/api\/orders\/([^/]+)$/);
  if(customerMatch&&req.method==='GET'){
    const customer=customerFromRequest(req);
    if(!customer)return json(res,401,{error:'Customer login required',code:'CUSTOMER_AUTH_REQUIRED'});
    const key=decodeURIComponent(customerMatch[1]);
    const row=db.prepare('SELECT * FROM orders WHERE customer_id=? AND (id=? OR order_code=?)').get(customer.id,key,key.toUpperCase());
    return row?json(res,200,{order:orderWithItems(row)}):json(res,404,{error:'Order not found'});
  }

  const storedMediaMatch=pathname.match(/^\/api\/media\/([a-f0-9-]+\.(?:png|jpg|webp))$/i);
  if(storedMediaMatch&&req.method==='GET'){
    const storedName=storedMediaMatch[1].toLowerCase();
    const mediaUrl='/api/media/'+storedName;
    const media=db.prepare('SELECT * FROM order_media WHERE url=?').get(mediaUrl);
    if(!media)return json(res,404,{error:'Media not found'});
    const order=db.prepare('SELECT * FROM orders WHERE id=?').get(media.order_id);
    if(!order)return json(res,404,{error:'Media not found'});

    const customer=customerFromRequest(req);
    const admin=adminUserFromRequest(req);
    const customerAllowed=Boolean(customer&&order.customer_id===customer.id);
    const adminAllowed=Boolean(admin&&admin.status==='active'&&adminPermission(admin,'orders').view);
    if(!customerAllowed&&!adminAllowed){
      return json(res,(customer||admin)?404:401,{error:(customer||admin)?'Media not found':'Authentication required',code:(customer||admin)?'MEDIA_NOT_FOUND':'AUTH_REQUIRED'});
    }

    try{
      const file=await readFile(path.join(uploadsDir,storedName));
      const ext=path.extname(storedName).toLowerCase();
      const mime=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';
      res.writeHead(200,{
        'Content-Type':mime,
        'Content-Length':file.length,
        'Cache-Control':'private, max-age=300, no-transform',
        'Content-Disposition':'inline'
      });
      return res.end(file);
    }catch{
      return json(res,404,{error:'Media not found'});
    }
  }

  if(pathname.startsWith('/api/admin/')){
    if(!adminOk(req)) return json(res,401,{error:'Admin authentication required',code:'ADMIN_AUTH_REQUIRED'});
    const currentAdmin=adminUserFromRequest(req);
    if(pathname==='/api/admin/session'&&req.method==='GET'){
      if(!currentAdmin) return json(res,403,{error:'Administrative user not found',code:'RBAC_USER_NOT_FOUND'});
      if(currentAdmin.status!=='active'){
        recordRbacDenied(req,currentAdmin,pathname,null,'account_suspended');
        return json(res,403,{error:'Administrative account is suspended',code:'RBAC_ACCOUNT_SUSPENDED',user_id:currentAdmin.id});
      }
      return json(res,200,adminSessionSnapshot(currentAdmin));
    }
    const rbac=enforceAdminRbac(req,res,pathname);
    if(!rbac) return;
    req.adminUser=rbac.user;

    if(pathname==='/api/admin/security'&&req.method==='GET'){
      return json(res,200,adminSecuritySnapshot(req,req.adminUser));
    }

    if(pathname==='/api/admin/security/password'&&req.method==='POST'){
      try{
        const d=await body(req);
        const currentPassword=String(d.current_password||'');
        const newPassword=String(d.new_password||'');
        const gate=authRateStatus('admin-security-password',req.adminUser.id,5,15);
        if(!gate.allowed)return json(res,429,{error:'Too many password attempts. Try again later.',code:'SECURITY_RATE_LIMITED',retry_after:gate.retryAfter});
        if(!currentPassword||!verifyPassword(currentPassword,req.adminUser.password_hash)){
          authRateFailure('admin-security-password',req.adminUser.id,5,15,15);
          adminAuthAudit('admin.security.password_failed',req.adminUser.id,{ip:adminRequestIp(req)});
          return json(res,401,{error:'Current password is incorrect',code:'CURRENT_PASSWORD_INVALID'});
        }
        if(newPassword.length<12||newPassword.length>128)return json(res,400,{error:'New password must be between 12 and 128 characters',code:'PASSWORD_POLICY'});
        if(verifyPassword(newPassword,req.adminUser.password_hash))return json(res,400,{error:'New password must be different from the current password',code:'PASSWORD_REUSE'});
        const changed=nowIso();
        const currentHash=adminCurrentSessionHash(req);
        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare('UPDATE admin_users SET password_hash=?,password_updated_at=?,updated_at=? WHERE id=?')
            .run(hashPassword(newPassword),changed,changed,req.adminUser.id);
          if(currentHash)db.prepare('DELETE FROM admin_sessions WHERE admin_id=? AND token_hash<>?').run(req.adminUser.id,currentHash);
          else db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').run(req.adminUser.id);
          governanceEvent('admin.security.password_changed','admin_user',req.adminUser.id,{actor:adminActorName(req.adminUser),details:{other_sessions_revoked:true}});
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}
        authRateClear('admin-security-password',req.adminUser.id);
        const fresh=db.prepare('SELECT * FROM admin_users WHERE id=?').get(req.adminUser.id);
        return json(res,200,{ok:true,security:adminSecuritySnapshot(req,fresh)});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to change password')})}
    }

    if(pathname==='/api/admin/security/contact/start'&&req.method==='POST'){
      try{
        const d=await body(req);
        const field=String(d.field||'').toLowerCase();
        const currentPassword=String(d.current_password||'');
        const gate=authRateStatus('admin-security-contact',`${req.adminUser.id}:${field}`,5,15);
        if(!gate.allowed)return json(res,429,{error:'Too many verification requests. Try again later.',code:'SECURITY_RATE_LIMITED',retry_after:gate.retryAfter});
        if(!currentPassword||!verifyPassword(currentPassword,req.adminUser.password_hash)){
          authRateFailure('admin-security-contact',`${req.adminUser.id}:${field}`,5,15,15);
          return json(res,401,{error:'Current password is incorrect',code:'CURRENT_PASSWORD_INVALID'});
        }
        let purpose='',value='';
        if(field==='email'){
          purpose='email_change';value=String(d.value||'').trim().toLowerCase();
          if(!validEmail(value))return json(res,400,{error:'Enter a valid email address'});
          if(value===String(req.adminUser.email||'').toLowerCase())return json(res,409,{error:'This email is already on your account'});
          if(db.prepare('SELECT id FROM admin_users WHERE lower(email)=lower(?) AND id<>?').get(value,req.adminUser.id))return json(res,409,{error:'This email is already used by another admin'});
          if(!otpProviderStatus().email)return json(res,503,{error:'Email OTP provider is not configured',code:'EMAIL_OTP_NOT_CONFIGURED'});
        }else if(field==='phone'){
          purpose='phone_change';value=normalizePhone(d.value||'');
          if(!validPhone(value))return json(res,400,{error:'Enter a valid Saudi mobile number'});
          if(value===normalizePhone(req.adminUser.phone||''))return json(res,409,{error:'This mobile number is already on your account'});
          if(db.prepare('SELECT id FROM admin_users WHERE phone=? AND id<>?').get(value,req.adminUser.id))return json(res,409,{error:'This mobile number is already used by another admin'});
          if(!otpProviderStatus().sms)return json(res,503,{error:'SMS OTP provider is not configured yet',code:'SMS_OTP_NOT_CONFIGURED'});
        }else return json(res,400,{error:'Security contact field must be email or phone'});

        const id=`SEC-${crypto.randomUUID()}`;
        const otp=String(crypto.randomInt(0,1_000_000)).padStart(6,'0');
        const delivery=await deliverSecurityContactOtp(purpose,value,otp);
        const created=nowIso();
        const expires=new Date(Date.now()+ADMIN_OTP_MINUTES*60*1000).toISOString();
        db.prepare('UPDATE admin_security_challenges SET consumed_at=? WHERE admin_id=? AND purpose=? AND consumed_at IS NULL')
          .run(created,req.adminUser.id,purpose);
        db.prepare(`INSERT INTO admin_security_challenges(id,admin_id,purpose,new_value,otp_hash,attempts,resend_count,created_at,last_sent_at,expires_at,consumed_at)
          VALUES(?,?,?,?,?,0,0,?,?,?,NULL)`).run(id,req.adminUser.id,purpose,value,adminOtpHash(id,otp),created,created,expires);
        authRateClear('admin-security-contact',`${req.adminUser.id}:${field}`);
        governanceEvent('admin.security.contact_verification_sent','admin_user',req.adminUser.id,{actor:adminActorName(req.adminUser),details:{field,destination:delivery.masked}});
        return json(res,200,{ok:true,challenge_id:id,field,channel:delivery.channel,destination:delivery.masked,expires_in:ADMIN_OTP_MINUTES*60,resend_after:ADMIN_OTP_RESEND_SECONDS});
      }catch(e){return json(res,503,{error:publicError(e,'Unable to send verification code'),code:'SECURITY_OTP_DELIVERY_FAILED'})}
    }

    if(pathname==='/api/admin/security/contact/resend'&&req.method==='POST'){
      try{
        const d=await body(req);
        const id=String(d.challenge_id||'');
        const row=adminSecurityChallengeRow(req.adminUser.id,id);
        if(!row||row.consumed_at||adminSecurityChallengeExpired(row))return json(res,410,{error:'Verification session expired. Start again.',code:'SECURITY_CHALLENGE_EXPIRED'});
        if(Number(row.resend_count||0)>=ADMIN_OTP_MAX_RESENDS)return json(res,429,{error:'Resend limit reached. Start again.',code:'OTP_RESEND_LIMIT'});
        const elapsed=Math.floor((Date.now()-Date.parse(row.last_sent_at))/1000);
        if(elapsed<ADMIN_OTP_RESEND_SECONDS)return json(res,429,{error:'Please wait before requesting another code.',code:'OTP_RESEND_COOLDOWN',retry_after:ADMIN_OTP_RESEND_SECONDS-elapsed});
        const otp=String(crypto.randomInt(0,1_000_000)).padStart(6,'0');
        const delivery=await deliverSecurityContactOtp(row.purpose,row.new_value,otp);
        const sent=nowIso();
        const expires=new Date(Date.now()+ADMIN_OTP_MINUTES*60*1000).toISOString();
        db.prepare('UPDATE admin_security_challenges SET otp_hash=?,attempts=0,resend_count=resend_count+1,last_sent_at=?,expires_at=? WHERE id=?')
          .run(adminOtpHash(id,otp),sent,expires,id);
        return json(res,200,{ok:true,destination:delivery.masked,expires_in:ADMIN_OTP_MINUTES*60,resend_after:ADMIN_OTP_RESEND_SECONDS});
      }catch(e){return json(res,503,{error:publicError(e,'Unable to resend verification code'),code:'SECURITY_OTP_DELIVERY_FAILED'})}
    }

    if(pathname==='/api/admin/security/contact/verify'&&req.method==='POST'){
      try{
        const d=await body(req);
        const id=String(d.challenge_id||'');
        const otp=String(d.otp||'').replace(/\D/g,'');
        const row=adminSecurityChallengeRow(req.adminUser.id,id);
        if(!row||row.consumed_at||adminSecurityChallengeExpired(row))return json(res,410,{error:'Verification code expired. Start again.',code:'SECURITY_CHALLENGE_EXPIRED'});
        if(Number(row.attempts||0)>=ADMIN_OTP_MAX_ATTEMPTS)return json(res,429,{error:'Too many incorrect codes. Start again.',code:'OTP_ATTEMPTS_EXCEEDED'});
        if(!/^\d{6}$/.test(otp)||!safeEqualText(adminOtpHash(id,otp),row.otp_hash)){
          const attempts=Number(row.attempts||0)+1;
          db.prepare('UPDATE admin_security_challenges SET attempts=? WHERE id=?').run(attempts,id);
          return json(res,401,{error:'Incorrect verification code',code:'OTP_INVALID',attempts_remaining:Math.max(0,ADMIN_OTP_MAX_ATTEMPTS-attempts)});
        }
        const field=row.purpose==='email_change'?'email':row.purpose==='phone_change'?'phone':'';
        if(!field)return json(res,400,{error:'Unsupported security verification purpose'});
        if(field==='email'&&db.prepare('SELECT id FROM admin_users WHERE lower(email)=lower(?) AND id<>?').get(row.new_value,req.adminUser.id))return json(res,409,{error:'This email is now used by another admin'});
        if(field==='phone'&&db.prepare('SELECT id FROM admin_users WHERE phone=? AND id<>?').get(row.new_value,req.adminUser.id))return json(res,409,{error:'This mobile number is now used by another admin'});
        const currentMode=normalizeAdminOtpMode(req.adminUser.otp_mode,req.adminUser.mfa);
        const nextMode=currentMode==='pending'?(field==='email'?'email':'sms'):currentMode;
        const changed=nowIso();
        db.exec('BEGIN IMMEDIATE');
        try{
          if(field==='email')db.prepare(`UPDATE admin_users SET email=?,email_verified=1,otp_mode=?,mfa=?,updated_at=? WHERE id=?`)
            .run(row.new_value,nextMode,legacyMfaForOtpMode(nextMode),changed,req.adminUser.id);
          else db.prepare(`UPDATE admin_users SET phone=?,phone_verified=1,otp_mode=?,mfa=?,updated_at=? WHERE id=?`)
            .run(row.new_value,nextMode,legacyMfaForOtpMode(nextMode),changed,req.adminUser.id);
          db.prepare('UPDATE admin_security_challenges SET consumed_at=? WHERE id=?').run(changed,id);
          governanceEvent(`admin.security.${field}_changed`,'admin_user',req.adminUser.id,{actor:adminActorName(req.adminUser),details:{verified:true}});
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}
        const fresh=db.prepare('SELECT * FROM admin_users WHERE id=?').get(req.adminUser.id);
        return json(res,200,{ok:true,field,security:adminSecuritySnapshot(req,fresh)});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to verify security contact')})}
    }

    if(pathname==='/api/admin/security/sessions/logout-all'&&req.method==='POST'){
      try{
        const d=await body(req);
        const includeCurrent=Boolean(d.include_current);
        const currentHash=adminCurrentSessionHash(req);
        let result;
        if(includeCurrent||!currentHash)result=db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').run(req.adminUser.id);
        else result=db.prepare('DELETE FROM admin_sessions WHERE admin_id=? AND token_hash<>?').run(req.adminUser.id,currentHash);
        governanceEvent('admin.security.sessions_revoked','admin_user',req.adminUser.id,{actor:adminActorName(req.adminUser),details:{include_current:includeCurrent,revoked:Number(result?.changes||0)}});
        if(includeCurrent)clearAdminSession(req,res);
        const fresh=db.prepare('SELECT * FROM admin_users WHERE id=?').get(req.adminUser.id);
        return json(res,200,{ok:true,logged_out:includeCurrent,revoked:Number(result?.changes||0),security:includeCurrent?null:adminSecuritySnapshot(req,fresh)});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to revoke sessions')})}
    }

    const securitySessionMatch=pathname.match(/^\/api\/admin\/security\/sessions\/([a-f0-9]{8,32})$/i);
    if(securitySessionMatch&&req.method==='DELETE'){
      try{
        const id=String(securitySessionMatch[1]).toLowerCase();
        const currentHash=adminCurrentSessionHash(req);
        const row=db.prepare(`SELECT token_hash FROM admin_sessions WHERE admin_id=? AND substr(lower(token_hash),1,?)=? LIMIT 1`)
          .get(req.adminUser.id,id.length,id);
        if(!row)return json(res,404,{error:'Session not found'});
        if(row.token_hash===currentHash)return json(res,409,{error:'Use Logout all devices to end the current session',code:'CURRENT_SESSION'});
        db.prepare('DELETE FROM admin_sessions WHERE token_hash=? AND admin_id=?').run(row.token_hash,req.adminUser.id);
        governanceEvent('admin.security.session_revoked','admin_user',req.adminUser.id,{actor:adminActorName(req.adminUser),details:{session:id}});
        const fresh=db.prepare('SELECT * FROM admin_users WHERE id=?').get(req.adminUser.id);
        return json(res,200,{ok:true,security:adminSecuritySnapshot(req,fresh)});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to revoke session')})}
    }

    if(pathname==='/api/admin/audit'&&req.method==='GET'){
      return json(res,200,auditSnapshot(auditFiltersFromUrl(url)));
    }
    const auditDetailMatch=pathname.match(/^\/api\/admin\/audit\/(\d+)$/);
    if(auditDetailMatch&&req.method==='GET'){
      const event=auditRow(db.prepare('SELECT * FROM audit_events WHERE id=?').get(Number(auditDetailMatch[1])));
      return event?json(res,200,{event,append_only:true}):json(res,404,{error:'Audit event not found'});
    }

    if(pathname==='/api/admin/governance'&&req.method==='GET'){
      return json(res,200,governanceSnapshot());
    }
    if(pathname==='/api/admin/governance/users'&&req.method==='GET'){
      return json(res,200,{users:governanceUsers(),summary:governanceSummary()});
    }
    if(pathname==='/api/admin/governance/users'&&req.method==='POST'){
      try{
        const d=await body(req);
        const name=String(d.name||d.name_en||'').trim();
        const nameAr=String(d.name_ar||name).trim();
        const nameEn=String(d.name_en||name).trim();
        const email=String(d.email||'').trim().toLowerCase();
        const phone=normalizePhone(d.phone||'');
        const role=String(d.role||'ops');
        const scope=String(d.scope||'central');
        const otpMode=normalizeAdminOtpMode(d.otp_mode??d.mfa,'pending');
        if(name.length<2) return json(res,400,{error:'Full name is required'});
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res,400,{error:'Valid admin email is required'});
        if(!validPhone(phone)) return json(res,400,{error:'Valid Saudi mobile number required'});
        if(!GOVERNANCE_ROLES.includes(role)) return json(res,400,{error:'Invalid governance role'});
        if(!GOVERNANCE_SCOPES.includes(scope)) return json(res,400,{error:'Invalid governance scope'});
        if(!GOVERNANCE_OTP_MODES.includes(otpMode)) return json(res,400,{error:'Invalid 2FA method'});
        if(db.prepare('SELECT id FROM admin_users WHERE lower(email)=lower(?)').get(email)) return json(res,409,{error:'Admin email already exists'});
        const id=nextGovernanceId('ADM-JED-','admin_users');
        const now=nowIso();
        const actor=String(d.actor||'System Administrator');
        db.exec('BEGIN IMMEDIATE');
        try{
          const legacyMfa=legacyMfaForOtpMode(otpMode);
          db.prepare(`INSERT INTO admin_users(
            id,name_ar,name_en,email,phone,role,scope,mfa,otp_mode,last_login,session_ar,session_en,device,status,created_at,updated_at
          ) VALUES(?,?,?,?,?,?,?,?,?,?,'—','—','—','active',?,?)`)
            .run(id,nameAr,nameEn,email,phone,role,scope,legacyMfa,otpMode,'Never',now,now);
          governanceEvent('governance.user.created','admin_user',id,{actor,toValue:'active',details:{email,phone,role,scope,otp_mode:otpMode}});
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}
        return json(res,201,{ok:true,user:governanceUserRow(db.prepare('SELECT * FROM admin_users WHERE id=?').get(id)),summary:governanceSummary()});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to create admin user')})}
    }
    const governanceUserMatch=pathname.match(/^\/api\/admin\/governance\/users\/([^/]+)$/);
    if(governanceUserMatch&&req.method==='PATCH'){
      try{
        const id=decodeURIComponent(governanceUserMatch[1]);
        const current=db.prepare('SELECT * FROM admin_users WHERE id=?').get(id);
        if(!current) return json(res,404,{error:'Administrative user not found'});
        const d=await body(req);
        const actor=String(d.actor||'System Administrator');
        const next={
          name_ar:d.name_ar===undefined?current.name_ar:String(d.name_ar||'').trim(),
          name_en:d.name_en===undefined?current.name_en:String(d.name_en||'').trim(),
          email:d.email===undefined?current.email:String(d.email||'').trim().toLowerCase(),
          phone:d.phone===undefined?current.phone:normalizePhone(d.phone),
          role:d.role===undefined?current.role:String(d.role),
          scope:d.scope===undefined?current.scope:String(d.scope),
          otp_mode:(d.otp_mode===undefined&&d.mfa===undefined)
            ?normalizeAdminOtpMode(current.otp_mode,current.mfa)
            :normalizeAdminOtpMode(d.otp_mode??d.mfa,current.mfa),
          status:d.status===undefined?current.status:String(d.status)
        };
        if(next.name_en.length<2||next.name_ar.length<2) return json(res,400,{error:'Full name is required'});
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) return json(res,400,{error:'Valid admin email is required'});
        if(!validPhone(next.phone)) return json(res,400,{error:'Valid Saudi mobile number required'});
        if(!GOVERNANCE_ROLES.includes(next.role)) return json(res,400,{error:'Invalid governance role'});
        if(!GOVERNANCE_SCOPES.includes(next.scope)) return json(res,400,{error:'Invalid governance scope'});
        if(!GOVERNANCE_OTP_MODES.includes(next.otp_mode)) return json(res,400,{error:'Invalid 2FA method'});
        if(!['active','suspended'].includes(next.status)) return json(res,400,{error:'Invalid account status'});
        const emailOwner=db.prepare('SELECT id FROM admin_users WHERE lower(email)=lower(?) AND id<>?').get(next.email,id);
        if(emailOwner) return json(res,409,{error:'Admin email already exists'});
        if(current.role==='owner'&&current.status==='active'&&(next.role!=='owner'||next.status!=='active')&&activeOwnerCount()<=1){
          return json(res,409,{error:'The last active platform owner cannot be suspended or reassigned'});
        }
        const changes=[];
        for(const field of ['name_ar','name_en','email','phone','role','scope','status']){
          if(String(current[field])!==String(next[field])) changes.push([field,current[field],next[field]]);
        }
        const currentOtpMode=normalizeAdminOtpMode(current.otp_mode,current.mfa);
        if(currentOtpMode!==next.otp_mode)changes.push(['otp_mode',currentOtpMode,next.otp_mode]);
        if(!changes.length) return json(res,200,{ok:true,user:governanceUserRow(current),summary:governanceSummary()});
        const now=nowIso();
        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare(`UPDATE admin_users SET name_ar=?,name_en=?,email=?,phone=?,role=?,scope=?,mfa=?,otp_mode=?,status=?,updated_at=? WHERE id=?`)
            .run(next.name_ar,next.name_en,next.email,next.phone,next.role,next.scope,legacyMfaForOtpMode(next.otp_mode),next.otp_mode,next.status,now,id);
          for(const [field,fromValue,toValue] of changes){
            let eventType=`governance.user.${field}.updated`;
            if(field==='status') eventType=`governance.user.${toValue==='suspended'?'suspended':'activated'}`;
            governanceEvent(eventType,'admin_user',id,{actor,fromValue,toValue,details:{field}});
          }
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}
        return json(res,200,{ok:true,user:governanceUserRow(db.prepare('SELECT * FROM admin_users WHERE id=?').get(id)),summary:governanceSummary()});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to update administrative user')})}
    }

    if(pathname==='/api/admin/governance/approvals'&&req.method==='GET'){
      return json(res,200,{approvals:governanceApprovals(),summary:governanceSummary()});
    }
    if(pathname==='/api/admin/governance/approvals'&&req.method==='POST'){
      try{
        const d=await body(req);
        const titleEn=String(d.title_en||d.title||'').trim();
        const titleAr=String(d.title_ar||titleEn).trim();
        const requestedBy=String(d.requested_by||'').trim();
        const risk=String(d.risk||'medium');
        if(titleEn.length<4||titleAr.length<4) return json(res,400,{error:'Approval title is required'});
        if(!db.prepare('SELECT id FROM admin_users WHERE id=?').get(requestedBy)) return json(res,400,{error:'Requesting admin user not found'});
        if(!['low','medium','high'].includes(risk)) return json(res,400,{error:'Invalid approval risk'});
        const id=nextGovernanceId('APR-','governance_approvals');
        const now=nowIso(); const actor=String(d.actor||'System Administrator');
        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare(`INSERT INTO governance_approvals(id,title_ar,title_en,requested_by,risk,status,requested_at)
            VALUES(?,?,?,?,?,'pending',?)`).run(id,titleAr,titleEn,requestedBy,risk,now);
          governanceEvent('governance.approval.created','approval',id,{actor,toValue:'pending',details:{requested_by:requestedBy,risk}});
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}
        return json(res,201,{ok:true,approval:governanceApprovalRow(db.prepare('SELECT * FROM governance_approvals WHERE id=?').get(id)),summary:governanceSummary()});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to create approval request')})}
    }
    const approvalMatch=pathname.match(/^\/api\/admin\/governance\/approvals\/([^/]+)$/);
    if(approvalMatch&&req.method==='PATCH'){
      try{
        const id=decodeURIComponent(approvalMatch[1]);
        const current=db.prepare('SELECT * FROM governance_approvals WHERE id=?').get(id);
        if(!current) return json(res,404,{error:'Approval request not found'});
        const d=await body(req);
        const status=String(d.status||'');
        const actor=String(d.actor||'System Administrator');
        if(!['approved','rejected'].includes(status)) return json(res,400,{error:'Approval decision must be approved or rejected'});
        if(current.status!=='pending') return json(res,409,{error:'Approval request has already been reviewed'});
        const now=nowIso();
        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare(`UPDATE governance_approvals SET status=?,reviewed_at=?,reviewed_by=? WHERE id=?`).run(status,now,actor,id);
          governanceEvent(`governance.approval.${status}`,'approval',id,{actor,fromValue:'pending',toValue:status,details:{requested_by:current.requested_by,risk:current.risk}});
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}
        return json(res,200,{ok:true,approval:governanceApprovalRow(db.prepare('SELECT * FROM governance_approvals WHERE id=?').get(id)),summary:governanceSummary()});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to review approval request')})}
    }

    if(pathname==='/api/admin/ai/quick-replies'&&req.method==='GET'){
      const phone=normalizePhone(url.searchParams.get('phone')||'');
      const language=String(url.searchParams.get('language')||'en');
      const order=phone
        ? (()=>{const row=db.prepare('SELECT * FROM orders WHERE phone=? ORDER BY datetime(created_at) DESC LIMIT 1').get(phone);return row?orderWithItems(row):null})()
        : null;
      return json(res,200,{quick_replies:aiService.quickReplies({order,language}),order});
    }

    if(pathname==='/api/admin/whatsapp/stream'&&req.method==='GET'){
      res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
      res.write(`event: ready\ndata: ${JSON.stringify({ok:true,time:nowIso()})}\n\n`);
      waStreamClients.add(res);
      const ping=setInterval(()=>{try{res.write(`event: ping\ndata: ${JSON.stringify({time:nowIso()})}\n\n`)}catch{}},25000);
      req.on('close',()=>{clearInterval(ping);waStreamClients.delete(res)});
      return;
    }
    if(pathname==='/api/admin/whatsapp/settings'&&req.method==='GET') return json(res,200,{settings:publicWaSettings()});
    if(pathname==='/api/admin/whatsapp/settings'&&req.method==='PATCH'){
      try{
        const d=await body(req);const current=getWaSettings();
        const next={
          phone_number_id:d.phone_number_id===undefined?current.phone_number_id:String(d.phone_number_id||'').trim(),
          waba_id:d.waba_id===undefined?current.waba_id:String(d.waba_id||'').trim(),
          display_phone_number:d.display_phone_number===undefined?current.display_phone_number:String(d.display_phone_number||'').trim(),
          graph_version:d.graph_version===undefined?current.graph_version:String(d.graph_version||'').trim(),
          enabled:d.enabled===undefined?current.enabled:(d.enabled?1:0)
        };
        if(next.phone_number_id&&!/^\d+$/.test(next.phone_number_id)) return json(res,400,{error:'Phone Number ID must contain digits only'});
        if(next.waba_id&&!/^\d+$/.test(next.waba_id)) return json(res,400,{error:'WABA ID must contain digits only'});
        if(next.graph_version&&!/^v\d+\.\d+$/.test(next.graph_version)) return json(res,400,{error:'Graph version must look like vXX.X'});
        db.prepare('UPDATE whatsapp_settings SET phone_number_id=?,waba_id=?,display_phone_number=?,graph_version=?,enabled=?,updated_at=? WHERE id=1').run(next.phone_number_id,next.waba_id,next.display_phone_number,next.graph_version,next.enabled,nowIso());
        waBroadcast('settings.updated',{settings:publicWaSettings()});
        return json(res,200,{ok:true,settings:publicWaSettings()});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to update WhatsApp settings')})}
    }
    if(pathname==='/api/admin/whatsapp/conversations'&&req.method==='GET') return json(res,200,{conversations:waConversations()});
    if(pathname==='/api/admin/whatsapp/messages'&&req.method==='GET'){
      const phone=toWaPhone(url.searchParams.get('phone'));
      if(!phone) return json(res,400,{error:'Valid Saudi WhatsApp mobile number required'});
      const messages=db.prepare('SELECT * FROM whatsapp_messages WHERE phone=? ORDER BY datetime(created_at) ASC').all(phone);
      return json(res,200,{messages});
    }
    if(pathname==='/api/admin/whatsapp/messages'&&req.method==='POST'){
      try{
        const d=await body(req);
        const sent=await sendWhatsAppText(d.phone,d.text,d.order_id||'');
        return json(res,201,{ok:true,...sent});
      }catch(e){return json(res,502,{error:publicError(e,'Unable to send WhatsApp message')})}
    }


    if(pathname==='/api/admin/finance'&&req.method==='GET'){
      return json(res,200,{
        summary:financeSummary(),
        ledger:financeOrderLedger(),
        settlements:financeSettlementsList()
      });
    }
    if(pathname==='/api/admin/finance/payments'&&req.method==='GET'){
      const orderId=String(url.searchParams.get('order_id')||'').trim();
      const rows=orderId
        ? db.prepare('SELECT * FROM finance_payments WHERE order_id=? ORDER BY datetime(created_at) DESC,id DESC').all(orderId)
        : db.prepare('SELECT * FROM finance_payments ORDER BY datetime(created_at) DESC,id DESC').all();
      return json(res,200,{payments:rows});
    }
    if(pathname==='/api/admin/finance/payments'&&req.method==='POST'){
      try{
        const d=await body(req);
        const orderId=String(d.order_id||'').trim();
        const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
        if(!order) return json(res,404,{error:'Order not found'});
        if(order.status==='cancelled') return json(res,409,{error:'Cannot record payment for a cancelled order'});

        const amount=Number(d.amount);
        if(!Number.isFinite(amount)||amount<=0) return json(res,400,{error:'Payment amount must be greater than zero'});
        const current=db.prepare('SELECT COALESCE(SUM(amount),0) paid FROM finance_payments WHERE order_id=?').get(orderId);
        const paid=Number(current.paid||0);
        const outstanding=Math.max(0,Number(order.total||0)-paid);
        if(outstanding<=0) return json(res,409,{error:'Invoice is already fully collected'});
        if(amount>outstanding+0.0001) return json(res,400,{error:`Payment exceeds outstanding balance (${outstanding.toFixed(2)} SAR)`});

        const method=financeMethodKey(d.method||order.payment_method||'cod');
        const reference=String(d.reference||'').trim().slice(0,120);
        const note=String(d.note||'').trim().slice(0,500);
        const actor=String(d.actor||'System Administrator').trim().slice(0,120)||'System Administrator';
        const id=`PAY-${Date.now()}-${crypto.randomInt(1000,9999)}`;
        const created=nowIso();

        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare(`INSERT INTO finance_payments(id,order_id,amount,method,reference,note,actor,created_at)
            VALUES(?,?,?,?,?,?,?,?)`).run(id,orderId,amount,method,reference,note,actor,created);
          db.prepare('INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)')
            .run(orderId,'payment.recorded',null,null,created);
          financeEvent('payment.recorded','payment',id,{orderId,actor,details:{amount,method,reference,note}});
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}

        const ledger=financeOrderLedger().find(r=>r.order_id===orderId);
        return json(res,201,{ok:true,payment:db.prepare('SELECT * FROM finance_payments WHERE id=?').get(id),invoice:ledger,summary:financeSummary()});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to record payment')})}
    }
    if(pathname==='/api/admin/finance/settlements'&&req.method==='GET'){
      return json(res,200,{settlements:financeSettlementsList(),summary:financeSummary()});
    }
    if(pathname==='/api/admin/finance/settlements'&&req.method==='POST'){
      try{
        const d=await body(req);
        const party=String(d.party||'').trim().slice(0,120);
        const amount=Number(d.amount);
        const method=String(d.method||'bank').trim().slice(0,40);
        const reference=String(d.reference||'').trim().slice(0,120);
        const actor=String(d.actor||'System Administrator').trim().slice(0,120)||'System Administrator';
        if(!party) return json(res,400,{error:'Settlement party is required'});
        if(!Number.isFinite(amount)||amount<=0) return json(res,400,{error:'Settlement amount must be greater than zero'});
        const collected=financeSummary().collected;
        const existing=db.prepare(`SELECT COALESCE(SUM(amount),0) amount FROM finance_settlements WHERE status IN ('pending','completed')`).get();
        const available=Math.max(0,collected-Number(existing.amount||0));
        if(amount>available+0.0001) return json(res,400,{error:`Settlement exceeds currently unsettled collected amount (${available.toFixed(2)} SAR)`});

        const id=`SET-${Date.now()}-${crypto.randomInt(1000,9999)}`;
        const created=nowIso();
        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare(`INSERT INTO finance_settlements(id,party,amount,method,reference,status,actor,created_at,completed_at)
            VALUES(?,?,?,?,?,'pending',?,?,NULL)`).run(id,party,amount,method,reference,actor,created);
          financeEvent('settlement.created','settlement',id,{actor,details:{party,amount,method,reference}});
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}
        return json(res,201,{ok:true,settlement:db.prepare('SELECT * FROM finance_settlements WHERE id=?').get(id),summary:financeSummary()});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to create settlement')})}
    }
    const settlementMatch=pathname.match(/^\/api\/admin\/finance\/settlements\/([^/]+)$/);
    if(settlementMatch&&req.method==='PATCH'){
      try{
        const d=await body(req);
        const row=db.prepare('SELECT * FROM finance_settlements WHERE id=?').get(settlementMatch[1]);
        if(!row) return json(res,404,{error:'Settlement not found'});
        const next=String(d.status||'').trim();
        if(!['completed','cancelled'].includes(next)) return json(res,400,{error:'Settlement status must be completed or cancelled'});
        if(row.status!=='pending') return json(res,409,{error:'Only pending settlements can be changed'});
        const completedAt=next==='completed'?nowIso():null;
        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare('UPDATE finance_settlements SET status=?,completed_at=? WHERE id=?').run(next,completedAt,row.id);
          financeEvent(`settlement.${next}`,'settlement',row.id,{actor:String(d.actor||'System Administrator'),details:{previous_status:row.status}});
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}
        return json(res,200,{ok:true,settlement:db.prepare('SELECT * FROM finance_settlements WHERE id=?').get(row.id),summary:financeSummary()});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to update settlement')})}
    }
    if(pathname==='/api/admin/finance/events'&&req.method==='GET'){
      const limit=Math.max(1,Math.min(200,Number(url.searchParams.get('limit')||100)));
      const rows=db.prepare('SELECT * FROM finance_events ORDER BY datetime(created_at) DESC,id DESC LIMIT ?').all(limit);
      return json(res,200,{events:rows});
    }


    if(pathname==='/api/admin/couriers'&&req.method==='GET'){
      return json(res,200,{couriers:listCouriers(),summary:deliverySummary()});
    }
    const deliveryMatch=pathname.match(/^\/api\/admin\/orders\/([^/]+)\/delivery$/);
    if(deliveryMatch&&req.method==='GET'){
      const order=db.prepare('SELECT * FROM orders WHERE id=?').get(deliveryMatch[1]);
      if(!order) return json(res,404,{error:'Order not found'});
      ensureOrderDelivery(order.id,order.created_at||nowIso());
      return json(res,200,{delivery:deliveryForOrder(order.id),order:orderWithItems(order),summary:deliverySummary()});
    }
    if(deliveryMatch&&req.method==='PATCH'){
      try{
        const order=db.prepare('SELECT * FROM orders WHERE id=?').get(deliveryMatch[1]);
        if(!order) return json(res,404,{error:'Order not found'});
        ensureOrderDelivery(order.id,order.created_at||nowIso());
        const current=db.prepare('SELECT * FROM order_deliveries WHERE order_id=?').get(order.id);
        const d=await body(req);
        const actor=String(d.actor||'System Administrator').trim().slice(0,120)||'System Administrator';
        const next={...current};

        if(d.courier_id!==undefined){
          const id=String(d.courier_id||'').trim();
          if(id){
            const courier=db.prepare('SELECT * FROM couriers WHERE id=? AND active=1').get(id);
            if(!courier) return json(res,400,{error:'Choose an active courier'});
            next.courier_id=id;
            if(id!==current.courier_id){
              next.assigned_at=nowIso();
              if(current.delivery_status==='unassigned'||current.delivery_status==='failed') next.delivery_status='assigned';
            }
          }else{
            if(current.delivery_status==='out_for_delivery'||current.delivery_status==='delivered') return json(res,409,{error:'Courier cannot be removed after dispatch'});
            next.courier_id=null;
            next.delivery_status='unassigned';
          }
        }

        if(d.delivery_status!==undefined){
          const v=String(d.delivery_status||'').trim();
          if(!['unassigned','assigned','out_for_delivery','delivered','failed'].includes(v)) return json(res,400,{error:'Invalid delivery status'});
          const operation=db.prepare('SELECT * FROM order_operations WHERE order_id=?').get(order.id);
          if(v==='assigned'){
            if(!next.courier_id) return json(res,409,{error:'Assign a courier first'});
            if(!['ready','delivery'].includes(order.status)) return json(res,409,{error:'Order must be ready for delivery before courier assignment'});
          }
          if(v==='out_for_delivery'){
            if(!next.courier_id) return json(res,409,{error:'Assign a courier before dispatch'});
            if(operation?.preparation_status!=='ready') return json(res,409,{error:'Preparation must be ready before dispatch'});
            if(!['ready','delivery'].includes(order.status)) return json(res,409,{error:'Order must be ready before dispatch'});
            if(current.delivery_status==='delivered') return json(res,409,{error:'Delivered order cannot be dispatched again'});
            next.out_for_delivery_at=next.out_for_delivery_at||nowIso();
          }
          if(v==='delivered'){
            if(current.delivery_status!=='out_for_delivery'&&next.delivery_status!=='out_for_delivery') return json(res,409,{error:'Order must be out for delivery first'});
            const receiver=String(d.receiver_name??next.receiver_name??'').trim();
            if(receiver.length<2) return json(res,400,{error:'Receiver name is required to complete delivery'});
            next.receiver_name=receiver.slice(0,120);
            next.pod_note=String(d.pod_note??next.pod_note??'').trim().slice(0,1000);
            next.delivered_at=nowIso();
            next.failed_reason='';
          }
          if(v==='failed'){
            if(!next.courier_id) return json(res,409,{error:'Assign a courier before marking a failed attempt'});
            const reason=String(d.failed_reason??next.failed_reason??'').trim();
            if(reason.length<3) return json(res,400,{error:'Failure reason is required'});
            next.failed_reason=reason.slice(0,500);
            next.failed_at=nowIso();
          }
          next.delivery_status=v;
        }

        if(d.receiver_name!==undefined) next.receiver_name=String(d.receiver_name||'').trim().slice(0,120);
        if(d.pod_note!==undefined) next.pod_note=String(d.pod_note||'').trim().slice(0,1000);
        if(d.failed_reason!==undefined) next.failed_reason=String(d.failed_reason||'').trim().slice(0,500);

        const changed=[];
        for(const key of ['courier_id','delivery_status','receiver_name','pod_note','failed_reason']){
          if(String(next[key]??'')!==String(current[key]??'')) changed.push([key,current[key],next[key]]);
        }
        if(!changed.length) return json(res,200,{ok:true,delivery:deliveryForOrder(order.id),order:orderWithItems(order),summary:deliverySummary()});

        const now=nowIso();
        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare(`UPDATE order_deliveries SET courier_id=?,delivery_status=?,assigned_at=?,out_for_delivery_at=?,delivered_at=?,failed_at=?,
              receiver_name=?,pod_note=?,failed_reason=?,assigned_by=?,updated_at=? WHERE order_id=?`)
            .run(next.courier_id,next.delivery_status,next.assigned_at,next.out_for_delivery_at,next.delivered_at,next.failed_at,
              next.receiver_name,next.pod_note,next.failed_reason,actor,now,order.id);

          for(const [key,fromVal,toVal] of changed) deliveryEvent(order.id,`delivery.${key}.updated`,fromVal,toVal,{actor});

          let syncedStatus=order.status;
          if(next.delivery_status==='out_for_delivery') syncedStatus='delivery';
          else if(next.delivery_status==='delivered') syncedStatus='completed';
          else if(next.delivery_status==='failed'&&order.status==='delivery') syncedStatus='ready';

          if(syncedStatus!==order.status){
            db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(syncedStatus,now,order.id);
            db.prepare('INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)')
              .run(order.id,'delivery.synced',order.status,syncedStatus,now);
          }else{
            db.prepare('UPDATE orders SET updated_at=? WHERE id=?').run(now,order.id);
          }

          if(next.delivery_status==='delivered') recordCodOnDelivery({...order,status:syncedStatus},actor);
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}

        const fresh=db.prepare('SELECT * FROM orders WHERE id=?').get(order.id);
        return json(res,200,{ok:true,delivery:deliveryForOrder(order.id),order:orderWithItems(fresh),summary:deliverySummary(),finance:financeSummary()});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to update delivery')})}
    }

    const orderMediaUploadMatch=pathname.match(/^\/api\/admin\/orders\/([^/]+)\/media\/upload$/);
    if(orderMediaUploadMatch&&req.method==='POST'){
      let storedName='';
      try{
        if(!adminPermission(req.adminUser,'orders').manage){
          recordRbacDenied(req,req.adminUser,pathname,{module:'orders',access:'manage'},'order_media_upload_denied');
          return json(res,403,{error:'Order media upload is not allowed for this role',code:'RBAC_FORBIDDEN',module:'orders',required:'manage'});
        }
        const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderMediaUploadMatch[1]);
        if(!order)return json(res,404,{error:'Order not found'});

        const contentType=String(req.headers['content-type']||'');
        const file=await rawBuffer(req,MAX_UPLOAD_BYTES);
        const info=validateImageUpload({contentType,buffer:file});
        storedName=safeStoredFilename(crypto.randomUUID(),info.ext);
        const destination=path.join(uploadsDir,storedName);
        await writeFile(destination,file,{flag:'wx'});

        const captionAr=String(url.searchParams.get('caption_ar')||'').trim().slice(0,220);
        const captionEn=String(url.searchParams.get('caption_en')||'').trim().slice(0,220);
        const actor=adminActorName(req.adminUser)||'System Administrator';
        const mediaUrl='/api/media/'+storedName;
        const created=nowIso();
        const result=db.prepare(`INSERT INTO order_media(order_id,media_type,url,caption_ar,caption_en,created_by,created_at)
          VALUES(?,?,?,?,?,?,?)`).run(order.id,'image',mediaUrl,captionAr,captionEn,actor,created);
        operationEvent(order.id,'operation.media.uploaded',null,String(result.lastInsertRowid),{
          actor,
          details:{media_type:'image',mime:info.mime,size:info.size,url:mediaUrl}
        });
        return json(res,201,{ok:true,media:mediaForOrder(order.id),order:orderWithItems(order),upload:{mime:info.mime,size:info.size}});
      }catch(e){
        if(storedName)await unlink(path.join(uploadsDir,storedName)).catch(()=>{});
        return json(res,400,{error:publicError(e,'Unable to upload image')});
      }
    }

    const orderMediaCollectionMatch=pathname.match(/^\/api\/admin\/orders\/([^/]+)\/media$/);
    if(orderMediaCollectionMatch&&req.method==='GET'){
      const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderMediaCollectionMatch[1]);
      if(!order) return json(res,404,{error:'Order not found'});
      return json(res,200,{media:mediaForOrder(order.id),order:orderWithItems(order)});
    }
    if(orderMediaCollectionMatch&&req.method==='POST'){
      try{
        if(!adminPermission(req.adminUser,'orders').manage){
          recordRbacDenied(req,req.adminUser,pathname,{module:'orders',access:'manage'},'order_media_create_denied');
          return json(res,403,{error:'Order media is view-only for this role',code:'RBAC_FORBIDDEN',module:'orders',required:'manage',role:req.adminUser.role,user_id:req.adminUser.id});
        }
        const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderMediaCollectionMatch[1]);
        if(!order) return json(res,404,{error:'Order not found'});
        const d=await body(req);
        const mediaType=String(d.media_type||'image').trim().toLowerCase();
        if(!['image','video'].includes(mediaType)) return json(res,400,{error:'Media type must be image or video'});
        const mediaUrl=validOrderMediaUrl(d.url);
        if(!mediaUrl) return json(res,400,{error:'Use a valid http(s) URL or an assets/... path'});
        const captionAr=String(d.caption_ar||'').trim().slice(0,220);
        const captionEn=String(d.caption_en||'').trim().slice(0,220);
        const actor=String(d.actor||adminActorName(req.adminUser)||'System Administrator').trim().slice(0,120)||'System Administrator';
        const created=nowIso();
        const result=db.prepare(`INSERT INTO order_media(order_id,media_type,url,caption_ar,caption_en,created_by,created_at)
          VALUES(?,?,?,?,?,?,?)`).run(order.id,mediaType,mediaUrl,captionAr,captionEn,actor,created);
        operationEvent(order.id,'operation.media.added',null,String(result.lastInsertRowid),{actor,details:{media_type:mediaType,url:mediaUrl}});
        return json(res,201,{ok:true,media:mediaForOrder(order.id),order:orderWithItems(order)});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to add order media')})}
    }
    const orderMediaItemMatch=pathname.match(/^\/api\/admin\/orders\/([^/]+)\/media\/(\d+)$/);
    if(orderMediaItemMatch&&req.method==='DELETE'){
      try{
        if(!adminPermission(req.adminUser,'orders').manage){
          recordRbacDenied(req,req.adminUser,pathname,{module:'orders',access:'manage'},'order_media_delete_denied');
          return json(res,403,{error:'Order media is view-only for this role',code:'RBAC_FORBIDDEN',module:'orders',required:'manage',role:req.adminUser.role,user_id:req.adminUser.id});
        }
        const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderMediaItemMatch[1]);
        if(!order) return json(res,404,{error:'Order not found'});
        const mediaId=Number(orderMediaItemMatch[2]);
        const row=db.prepare('SELECT * FROM order_media WHERE id=? AND order_id=?').get(mediaId,order.id);
        if(!row) return json(res,404,{error:'Media item not found'});
        const actor=adminActorName(req.adminUser)||'System Administrator';
        db.prepare('DELETE FROM order_media WHERE id=? AND order_id=?').run(mediaId,order.id);
        if(String(row.url||'').startsWith('/api/media/')){
          const storedName=path.basename(String(row.url));
          if(/^[a-f0-9-]+\.(?:png|jpg|webp)$/i.test(storedName))await unlink(path.join(uploadsDir,storedName)).catch(()=>{});
        }
        operationEvent(order.id,'operation.media.removed',String(mediaId),null,{actor,details:{media_type:row.media_type,url:row.url}});
        return json(res,200,{ok:true,media:mediaForOrder(order.id),order:orderWithItems(order)});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to remove order media')})}
    }

    if(pathname==='/api/admin/slaughterhouses'&&req.method==='GET'){
      return json(res,200,{slaughterhouses:listSlaughterhouses(),summary:operationsSummary()});
    }
    const operationMatch=pathname.match(/^\/api\/admin\/orders\/([^/]+)\/operations$/);
    if(operationMatch&&req.method==='GET'){
      const order=db.prepare('SELECT * FROM orders WHERE id=?').get(operationMatch[1]);
      if(!order) return json(res,404,{error:'Order not found'});
      ensureOrderOperation(order.id,order.created_at||nowIso());
      return json(res,200,{operation:operationForOrder(order.id),order:orderWithItems(order)});
    }
    if(operationMatch&&req.method==='PATCH'){
      try{
        const order=db.prepare('SELECT * FROM orders WHERE id=?').get(operationMatch[1]);
        if(!order) return json(res,404,{error:'Order not found'});
        ensureOrderOperation(order.id,order.created_at||nowIso());
        const current=db.prepare('SELECT * FROM order_operations WHERE order_id=?').get(order.id);
        const d=await body(req);
        const actor=String(d.actor||'System Administrator').trim().slice(0,120)||'System Administrator';
        const next={...current};

        if(d.slaughterhouse_id!==undefined){
          const id=String(d.slaughterhouse_id||'').trim();
          const house=db.prepare('SELECT * FROM slaughterhouses WHERE id=? AND active=1').get(id);
          if(!house) return json(res,400,{error:'Choose an active slaughterhouse'});
          next.slaughterhouse_id=id;
          if(id!==current.slaughterhouse_id) next.assigned_at=nowIso();
        }
        if(d.veterinary_status!==undefined){
          const v=String(d.veterinary_status||'').trim();
          if(!['pending','passed','failed'].includes(v)) return json(res,400,{error:'Invalid veterinary status'});
          next.veterinary_status=v;
          if(v!=='pending'&&v!==current.veterinary_status) next.vet_checked_at=nowIso();
        }
        if(d.slaughter_status!==undefined){
          const v=String(d.slaughter_status||'').trim();
          if(!['pending','in_progress','completed'].includes(v)) return json(res,400,{error:'Invalid slaughter status'});
          if(v!=='pending'&&next.veterinary_status!=='passed') return json(res,409,{error:'Veterinary check must pass before slaughter can start'});
          next.slaughter_status=v;
          if(v==='in_progress'&&current.slaughter_status!=='in_progress') next.slaughter_started_at=nowIso();
          if(v==='completed'&&current.slaughter_status!=='completed') next.slaughter_completed_at=nowIso();
        }
        if(d.preparation_status!==undefined){
          const v=String(d.preparation_status||'').trim();
          if(!['pending','in_progress','ready'].includes(v)) return json(res,400,{error:'Invalid preparation status'});
          if(v!=='pending'&&next.slaughter_status!=='completed') return json(res,409,{error:'Slaughter must be completed before preparation can start'});
          next.preparation_status=v;
          if(v==='in_progress'&&current.preparation_status!=='in_progress') next.preparation_started_at=nowIso();
          if(v==='ready'&&current.preparation_status!=='ready') next.preparation_completed_at=nowIso();
        }
        if(d.notes!==undefined) next.notes=String(d.notes||'').trim().slice(0,1000);

        const changed=[];
        for(const key of ['slaughterhouse_id','veterinary_status','slaughter_status','preparation_status','notes']){
          if(String(next[key]??'')!==String(current[key]??'')) changed.push([key,current[key],next[key]]);
        }
        if(!changed.length){
          const reconciled=reconcileOrderStatusFromWorkflow(order);
          return json(res,200,{ok:true,operation:operationForOrder(order.id),order:orderWithItems(reconciled),summary:operationsSummary()});
        }

        const now=nowIso();
        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare(`UPDATE order_operations SET slaughterhouse_id=?,veterinary_status=?,slaughter_status=?,preparation_status=?,
              assigned_at=?,vet_checked_at=?,slaughter_started_at=?,slaughter_completed_at=?,preparation_started_at=?,preparation_completed_at=?,
              assigned_by=?,notes=?,updated_at=? WHERE order_id=?`)
            .run(next.slaughterhouse_id,next.veterinary_status,next.slaughter_status,next.preparation_status,
              next.assigned_at,next.vet_checked_at,next.slaughter_started_at,next.slaughter_completed_at,next.preparation_started_at,next.preparation_completed_at,
              actor,next.notes,now,order.id);
          for(const [key,fromVal,toVal] of changed) operationEvent(order.id,`operation.${key}.updated`,fromVal,toVal,{actor});

          let syncedStatus=order.status;
          if(next.preparation_status==='ready' && ['received','confirmed','preparing'].includes(syncedStatus)) syncedStatus='ready';
          else if((next.slaughter_status==='in_progress'||next.slaughter_status==='completed'||next.preparation_status==='in_progress') && ['received','confirmed'].includes(syncedStatus)) syncedStatus='preparing';

          if(syncedStatus!==order.status){
            db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(syncedStatus,now,order.id);
            db.prepare('INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)')
              .run(order.id,'operations.synced',order.status,syncedStatus,now);
          }else{
            db.prepare('UPDATE orders SET updated_at=? WHERE id=?').run(now,order.id);
          }
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}

        const fresh=db.prepare('SELECT * FROM orders WHERE id=?').get(order.id);
        return json(res,200,{ok:true,operation:operationForOrder(order.id),order:orderWithItems(fresh),summary:operationsSummary()});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to update order operations')})}
    }

    if(pathname==='/api/admin/orders'&&req.method==='GET'){
      const orders=listOrders().map(o=>redactOrderFinance(o,req.adminUser));
      return json(res,200,{orders,finance_redacted:!adminPermission(req.adminUser,'finance').view});
    }
    if(pathname==='/api/admin/stats'&&req.method==='GET'){
      const totals=db.prepare(`SELECT COUNT(*) orders,COALESCE(SUM(total),0) revenue,SUM(CASE WHEN status='received' THEN 1 ELSE 0 END) new_orders,SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) completed FROM orders`).get();
      if(!adminPermission(req.adminUser,'finance').view){
        delete totals.revenue;
        totals.finance_redacted=true;
      }
      return json(res,200,{stats:totals});
    }
    const statusMatch=pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
    if(statusMatch&&req.method==='PATCH'){
      try{
        const d=await body(req);const next=String(d.status||'');
        if(!allowedStatuses.includes(next)) return json(res,400,{error:'Invalid status'});
        const row=db.prepare('SELECT * FROM orders WHERE id=?').get(statusMatch[1]);
        if(!row) return json(res,404,{error:'Order not found'});
        const touchesDelivery=['delivery','completed'].includes(next)||['delivery','completed'].includes(row.status);
        if(touchesDelivery&&!adminPermission(req.adminUser,'delivery').manage){
          recordRbacDenied(req,req.adminUser,pathname,{module:'delivery',access:'manage'},'delivery_status_transition_denied');
          return json(res,403,{error:'Delivery workflow is view-only for this role',code:'RBAC_FORBIDDEN',module:'delivery',required:'manage',role:req.adminUser.role,user_id:req.adminUser.id});
        }
        const now=nowIso();
        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(next,now,row.id);
          db.prepare('INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)').run(row.id,'status.updated',row.status,next,now);
          ensureOrderOperation(row.id,row.created_at||now);
          ensureOrderDelivery(row.id,row.created_at||now);
          const op=db.prepare('SELECT * FROM order_operations WHERE order_id=?').get(row.id);
          if(next==='preparing' && op.preparation_status==='pending'){
            db.prepare(`UPDATE order_operations SET preparation_status='in_progress',preparation_started_at=COALESCE(preparation_started_at,?),updated_at=? WHERE order_id=?`).run(now,now,row.id);
            operationEvent(row.id,'operation.preparation_status.updated',op.preparation_status,'in_progress',{details:{source:'order_status'}});
          }else if(next==='ready' && op.preparation_status!=='ready'){
            db.prepare(`UPDATE order_operations SET preparation_status='ready',preparation_completed_at=COALESCE(preparation_completed_at,?),updated_at=? WHERE order_id=?`).run(now,now,row.id);
            operationEvent(row.id,'operation.preparation_status.updated',op.preparation_status,'ready',{details:{source:'order_status'}});
          }

          const del=db.prepare('SELECT * FROM order_deliveries WHERE order_id=?').get(row.id);
          if(next==='delivery' && del.delivery_status!=='out_for_delivery'){
            if(!del.courier_id) throw new Error('Assign a courier before setting Out for delivery');
            db.prepare(`UPDATE order_deliveries SET delivery_status='out_for_delivery',out_for_delivery_at=COALESCE(out_for_delivery_at,?),updated_at=? WHERE order_id=?`).run(now,now,row.id);
            deliveryEvent(row.id,'delivery.status.synced',del.delivery_status,'out_for_delivery',{actor:adminActorName(req.adminUser),details:{source:'order_status'}});
          }else if(next==='completed' && del.delivery_status!=='delivered'){
            if(del.delivery_status!=='out_for_delivery') throw new Error('Order must be Out for delivery before Delivered');
            if(!String(del.receiver_name||'').trim()) throw new Error('Receiver name is required before Delivered');
            db.prepare(`UPDATE order_deliveries SET delivery_status='delivered',delivered_at=COALESCE(delivered_at,?),updated_at=? WHERE order_id=?`).run(now,now,row.id);
            deliveryEvent(row.id,'delivery.status.synced',del.delivery_status,'delivered',{actor:adminActorName(req.adminUser),details:{source:'order_status'}});
            recordCodOnDelivery({...row,status:'completed'},adminActorName(req.adminUser));
          }else if(next==='ready' && del.delivery_status==='failed'){
            db.prepare(`UPDATE order_deliveries SET delivery_status='assigned',updated_at=? WHERE order_id=?`).run(now,row.id);
            deliveryEvent(row.id,'delivery.status.synced','failed','assigned',{actor:adminActorName(req.adminUser),details:{source:'order_status'}});
          }
          db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e}
        return json(res,200,{ok:true,order:orderWithItems(db.prepare('SELECT * FROM orders WHERE id=?').get(row.id))});
      }catch(e){return json(res,400,{error:publicError(e,'Unable to update status')})}
    }
  }
  return json(res,404,{error:'API route not found'});
}

const server=http.createServer(async(req,res)=>{
  applySecurityHeaders(req,res);
  if(enforceHttps(req,res))return;
  try{
    const url=new URL(req.url,'http://localhost');
    if(handleCorsPreflight(req,res,url))return;
    if(rejectUntrustedBrowserOrigin(req,res,url))return;
    if(url.pathname.startsWith('/api/')) return await handleApi(req,res,url);
    const pathname=decodeURIComponent(url.pathname);
    let target=pathname==='/'?'/index.html':pathname;
    if(IS_PRODUCTION&&target==='/app.js')target='/dist/app.min.js';
    if(IS_PRODUCTION&&target==='/style.css')target='/dist/style.min.css';
    const file=path.resolve(root,'.'+target);
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);return res.end('Forbidden')}
    const data=await readFile(file);
    sendStatic(req,res,file,data);
  }catch(e){
    if(!res.headersSent){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found')}
    else try{res.end()}catch{}
  }
});
server.requestTimeout=30_000;
server.headersTimeout=35_000;
server.keepAliveTimeout=5_000;

server.listen(PORT,HOST,()=>{
  const wa=publicWaSettings();
  console.log(`Kabsh Najd: http://${HOST}:${PORT}`);
  console.log(`Database: ${dbPath}`);
  console.log(`RBAC default admin: ${DEFAULT_ADMIN_USER_ID}`);
  const otp=otpProviderStatus();
  console.log(`Admin 2FA: password + OTP (${otp.email?'email ready':'email not configured'}, ${otp.sms?'SMS ready':'SMS not configured'})`);
  if(!configuredOtpPepper)console.warn('KABSH_OTP_PEPPER is not set; OTP challenges will be invalidated by a server restart.');
  console.log(`Security: ${IS_PRODUCTION?'production':'development'} mode, secure cookies ${COOKIE_SECURE?'on':'off'}, trusted proxy ${TRUST_PROXY?'on':'off'}`);
  console.log(`WhatsApp: ${wa.configured?'configured':'not configured'}${wa.display_phone_number?` (${wa.display_phone_number})`:''}`);
  console.log('WhatsApp number/IDs are database-configurable; secrets stay in .env');
  console.log('AI chatbot: grounded backend ready at POST /api/ai/chat');
  console.log('WhatsApp AI reply: POST /api/ai/whatsapp-reply (secure admin session required)');
});
