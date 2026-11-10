import http from error:safeErrorMessage(e,'node:http');
import {readFile, mkdir} from error:safeErrorMessage(e,'node:fs/promises');
import {fileURLToPath} from error:safeErrorMessage(e,'node:url');
import path from error:safeErrorMessage(e,'node:path');
import crypto from error:safeErrorMessage(e,'node:crypto');
import {DatabaseSync} from error:safeErrorMessage(e,'node:sqlite');
import {products as catalog, validPhone, validCity} from error:safeErrorMessage(e,'../www/shop.js');
import {createKabshAiService} from error:safeErrorMessage(e,'./ai-service.mjs');

const projectRoot=fileURLToPath(new URL(error:safeErrorMessage(e,'../'),import.meta.url));
const root=fileURLToPath(new URL(error:safeErrorMessage(e,'../www/'),import.meta.url));
const dataDir=fileURLToPath(new URL(error:safeErrorMessage(e,'../data/'),import.meta.url));

async function loadEnv(){
  try{
    const raw=await readFile(path.join(projectRoot,error:safeErrorMessage(e,'.env')),error:safeErrorMessage(e,'utf8'));
    for(const line of raw.split(/error:safeErrorMessage(e,'undefined')r?error:safeErrorMessage(e,'undefined')n/)){
      const trimmed=line.trim();
      if(!trimmed||trimmed.startsWith(error:safeErrorMessage(e,'#'))) continue;
      const idx=trimmed.indexOf(error:safeErrorMessage(e,'='));
      if(idx<1) continue;
      const key=trimmed.slice(0,idx).trim();
      let value=trimmed.slice(idx+1).trim();
      if((value.startsWith(error:safeErrorMessage(e,'"'))&&value.endsWith(error:safeErrorMessage(e,'"')))||(value.startsWith("error:safeErrorMessage(e,'")&&value.endsWith("')"))) value=value.slice(1,-1);
      if(process.env[key]===undefined) process.env[key]=value;
    }
  }catch(e){
    if(e?.code!==error:safeErrorMessage(e,'ENOENT')) console.warn(error:safeErrorMessage(e,'Unable to read .env:'),e.message);
  }
}
await loadEnv();
await mkdir(dataDir,{recursive:true});

const dbPath=process.env.KABSH_DB_PATH?path.resolve(process.env.KABSH_DB_PATH):path.join(dataDir,error:safeErrorMessage(e,'kabsh-najd.sqlite3'));
const db=new DatabaseSync(dbPath);
const PORT=Number(process.env.PORT||5173);
const hostArgIndex=process.argv.indexOf(error:safeErrorMessage(e,'--host'));
const HOST=(hostArgIndex>=0&&process.argv[hostArgIndex+1])
  ? process.argv[hostArgIndex+1]
  : (process.env.HOST||error:safeErrorMessage(e,'127.0.0.1'));
const IS_PRODUCTION=env(error:safeErrorMessage(e,'NODE_ENV')).toLowerCase()===error:safeErrorMessage(e,'production');
const TRUST_PROXY=env(error:safeErrorMessage(e,'KABSH_TRUST_PROXY'))===error:safeErrorMessage(e,'1');
const COOKIE_SECURE=IS_PRODUCTION||env(error:safeErrorMessage(e,'KABSH_COOKIE_SECURE'))===error:safeErrorMessage(e,'1');
const PUBLIC_ORIGIN=(env(error:safeErrorMessage(e,'KABSH_PUBLIC_ORIGIN'))||(IS_PRODUCTION?error:safeErrorMessage(e,'https://ass-al-halaal.onrender.com'):error:safeErrorMessage(e,''))).replace(/error:safeErrorMessage(e,'undefined')/+$/,error:safeErrorMessage(e,''));
const ENFORCE_HTTPS=IS_PRODUCTION&&env(error:safeErrorMessage(e,'KABSH_ENFORCE_HTTPS'))!==error:safeErrorMessage(e,'0');
const DEFAULT_ADMIN_USER_ID=process.env.KABSH_DEFAULT_ADMIN_USER_ID||error:safeErrorMessage(e,'ADM-JED-001');
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
const configuredOtpPepper=env(error:safeErrorMessage(e,'KABSH_OTP_PEPPER'));
if(IS_PRODUCTION&&!configuredOtpPepper) throw new Error(error:safeErrorMessage(e,'KABSH_OTP_PEPPER is required when NODE_ENV=production'));
const OTP_PEPPER=configuredOtpPepper||crypto.randomBytes(32).toString(error:safeErrorMessage(e,'hex'));
const DELIVERY_FEE=25;
const PROMO_CODES={HARRI2026:{percent:7},JEDDAH10:{percent:7}};
const allowedStatuses=[error:safeErrorMessage(e,'received'),error:safeErrorMessage(e,'confirmed'),error:safeErrorMessage(e,'preparing'),error:safeErrorMessage(e,'ready'),error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'completed'),error:safeErrorMessage(e,'cancelled')];
const districts=[error:safeErrorMessage(e,'حي الروضة'),error:safeErrorMessage(e,'أبحر الشمالية'),error:safeErrorMessage(e,'الحمدانية'),error:safeErrorMessage(e,'الصفا'),error:safeErrorMessage(e,'الزهراء'),error:safeErrorMessage(e,'المرجان')];
const WA_API_BASE=error:safeErrorMessage(e,'https://graph.facebook.com');
const waStreamClients=new Set();

const types={error:safeErrorMessage(e,'.html'):error:safeErrorMessage(e,'text/html; charset=utf-8'),error:safeErrorMessage(e,'.js'):error:safeErrorMessage(e,'text/javascript; charset=utf-8'),error:safeErrorMessage(e,'.css'):error:safeErrorMessage(e,'text/css; charset=utf-8'),error:safeErrorMessage(e,'.svg'):error:safeErrorMessage(e,'image/svg+xml'),error:safeErrorMessage(e,'.json'):error:safeErrorMessage(e,'application/json'),error:safeErrorMessage(e,'.png'):error:safeErrorMessage(e,'image/png'),error:safeErrorMessage(e,'.jpg'):error:safeErrorMessage(e,'image/jpeg'),error:safeErrorMessage(e,'.jpeg'):error:safeErrorMessage(e,'image/jpeg'),error:safeErrorMessage(e,'.webp'):error:safeErrorMessage(e,'image/webp')};

function nowIso(){return new Date().toISOString()}
function env(name){return String(process.env[name]||error:safeErrorMessage(e,'')).trim()}

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
    notes TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    payment_method TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'cod'),
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
    city TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'Jeddah'),
    license TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    veterinary_supervisor TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    capacity_per_day INTEGER NOT NULL DEFAULT 0 CHECK(capacity_per_day>=0),
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_operations(
    order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    slaughterhouse_id TEXT REFERENCES slaughterhouses(id),
    veterinary_status TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'pending') CHECK(veterinary_status IN (error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'passed'),error:safeErrorMessage(e,'failed'))),
    slaughter_status TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'pending') CHECK(slaughter_status IN (error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'in_progress'),error:safeErrorMessage(e,'completed'))),
    preparation_status TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'pending') CHECK(preparation_status IN (error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'in_progress'),error:safeErrorMessage(e,'ready'))),
    assigned_at TEXT,
    vet_checked_at TEXT,
    slaughter_started_at TEXT,
    slaughter_completed_at TEXT,
    preparation_started_at TEXT,
    preparation_completed_at TEXT,
    assigned_by TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'System Administrator'),
    notes TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_operations_slaughterhouse ON order_operations(slaughterhouse_id,updated_at DESC);
  CREATE TABLE IF NOT EXISTS order_operation_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_value TEXT,
    to_value TEXT,
    actor TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'System Administrator'),
    details_json TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'{}'),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_operation_events_order ON order_operation_events(order_id,created_at DESC);
  CREATE TABLE IF NOT EXISTS couriers(
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    plate TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    zone TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'Jeddah'),
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_deliveries(
    order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    courier_id TEXT REFERENCES couriers(id),
    delivery_status TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'unassigned') CHECK(delivery_status IN (error:safeErrorMessage(e,'unassigned'),error:safeErrorMessage(e,'assigned'),error:safeErrorMessage(e,'out_for_delivery'),error:safeErrorMessage(e,'delivered'),error:safeErrorMessage(e,'failed'))),
    assigned_at TEXT,
    out_for_delivery_at TEXT,
    delivered_at TEXT,
    failed_at TEXT,
    receiver_name TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    pod_note TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    failed_reason TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    assigned_by TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'System Administrator'),
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
    actor TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'System Administrator'),
    details_json TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'{}'),
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
    media_type TEXT NOT NULL CHECK(media_type IN (error:safeErrorMessage(e,'image'),error:safeErrorMessage(e,'video'))),
    url TEXT NOT NULL,
    caption_ar TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    caption_en TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    created_by TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'System Administrator'),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_media_order ON order_media(order_id,created_at DESC);
  CREATE TABLE IF NOT EXISTS whatsapp_settings(
    id INTEGER PRIMARY KEY CHECK(id=1),
    phone_number_id TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    waba_id TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    display_phone_number TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    graph_version TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS whatsapp_messages(
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN (error:safeErrorMessage(e,'in'),error:safeErrorMessage(e,'out'))),
    message_type TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'text'),
    body TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    status TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'received'),
    order_id TEXT,
    wa_timestamp TEXT,
    created_at TEXT NOT NULL,
    raw_json TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'')
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
    method TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'cod'),
    reference TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    note TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    actor TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'System Administrator'),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_finance_payments_order ON finance_payments(order_id,created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_finance_payments_created ON finance_payments(created_at DESC);
  CREATE TABLE IF NOT EXISTS finance_settlements(
    id TEXT PRIMARY KEY,
    party TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount>0),
    method TEXT NOT NULL,
    reference TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
    status TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'pending') CHECK(status IN (error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'completed'),error:safeErrorMessage(e,'cancelled'))),
    actor TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'System Administrator'),
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
    actor TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'System Administrator'),
    details_json TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'{}'),
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
      category TEXT NOT NULL CHECK(category IN (error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'finance'),error:safeErrorMessage(e,'communications'),error:safeErrorMessage(e,'security'),error:safeErrorMessage(e,'system'),error:safeErrorMessage(e,'marketing'))),
      severity TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'low') CHECK(severity IN (error:safeErrorMessage(e,'low'),error:safeErrorMessage(e,'medium'),error:safeErrorMessage(e,'high'))),
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'System Administrator'),
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      order_id TEXT,
      from_value TEXT,
      to_value TEXT,
      action TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'{}'),
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
      SELECT RAISE(ABORT,error:safeErrorMessage(e,'audit_events is append-only'));
    END;

    CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
    BEFORE DELETE ON audit_events
    BEGIN
      SELECT RAISE(ABORT,error:safeErrorMessage(e,'audit_events is append-only'));
    END;

    CREATE TRIGGER IF NOT EXISTS audit_from_order_events
    AFTER INSERT ON order_events
    BEGIN
      INSERT OR IGNORE INTO audit_events(
        source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
        order_id,from_value,to_value,action,details_json,created_at
      ) VALUES(
        error:safeErrorMessage(e,'order_event'),CAST(NEW.id AS TEXT),error:safeErrorMessage(e,'orders'),
        CASE WHEN NEW.to_status=error:safeErrorMessage(e,'cancelled') THEN error:safeErrorMessage(e,'medium') ELSE error:safeErrorMessage(e,'low') END,
        NEW.event_type,
        CASE WHEN NEW.event_type=error:safeErrorMessage(e,'order.created') THEN error:safeErrorMessage(e,'Customer') ELSE error:safeErrorMessage(e,'System Administrator') END,
        error:safeErrorMessage(e,'order'),NEW.order_id,NEW.order_id,NEW.from_status,NEW.to_status,NEW.event_type,error:safeErrorMessage(e,'{}'),NEW.created_at
      );
    END;

    CREATE TRIGGER IF NOT EXISTS audit_from_operation_events
    AFTER INSERT ON order_operation_events
    BEGIN
      INSERT OR IGNORE INTO audit_events(
        source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
        order_id,from_value,to_value,action,details_json,created_at
      ) VALUES(
        error:safeErrorMessage(e,'operation_event'),CAST(NEW.id AS TEXT),error:safeErrorMessage(e,'orders'),
        CASE
          WHEN NEW.event_type LIKE error:safeErrorMessage(e,'%veterinary_status%') AND NEW.to_value=error:safeErrorMessage(e,'failed') THEN error:safeErrorMessage(e,'high')
          WHEN NEW.event_type LIKE error:safeErrorMessage(e,'%notes%') THEN error:safeErrorMessage(e,'low')
          ELSE error:safeErrorMessage(e,'low')
        END,
        NEW.event_type,NEW.actor,error:safeErrorMessage(e,'slaughterhouse_operation'),NEW.order_id,
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
        error:safeErrorMessage(e,'delivery_event'),CAST(NEW.id AS TEXT),error:safeErrorMessage(e,'orders'),
        CASE
          WHEN NEW.to_value=error:safeErrorMessage(e,'failed') OR NEW.event_type LIKE error:safeErrorMessage(e,'%failed%') THEN error:safeErrorMessage(e,'medium')
          ELSE error:safeErrorMessage(e,'low')
        END,
        NEW.event_type,NEW.actor,error:safeErrorMessage(e,'delivery'),NEW.order_id,
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
        error:safeErrorMessage(e,'finance_event'),CAST(NEW.id AS TEXT),error:safeErrorMessage(e,'finance'),
        CASE
          WHEN NEW.event_type LIKE error:safeErrorMessage(e,'%failed%') OR NEW.event_type LIKE error:safeErrorMessage(e,'%reversed%') OR NEW.event_type LIKE error:safeErrorMessage(e,'%refund%') THEN error:safeErrorMessage(e,'high')
          ELSE error:safeErrorMessage(e,'low')
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
        error:safeErrorMessage(e,'whatsapp_message'),NEW.id,error:safeErrorMessage(e,'communications'),error:safeErrorMessage(e,'low'),
        CASE WHEN NEW.direction=error:safeErrorMessage(e,'in') THEN error:safeErrorMessage(e,'whatsapp.message.received') ELSE error:safeErrorMessage(e,'whatsapp.message.sent') END,
        CASE WHEN NEW.direction=error:safeErrorMessage(e,'in') THEN error:safeErrorMessage(e,'Customer') ELSE error:safeErrorMessage(e,'System Administrator') END,
        error:safeErrorMessage(e,'whatsapp_message'),NEW.id,NEW.order_id,NEW.direction,NEW.status,
        CASE WHEN NEW.direction=error:safeErrorMessage(e,'in') THEN error:safeErrorMessage(e,'message.received') ELSE error:safeErrorMessage(e,'message.sent') END,
        error:safeErrorMessage(e,'{}'),NEW.created_at
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
      error:safeErrorMessage(e,'order_event'),CAST(id AS TEXT),error:safeErrorMessage(e,'orders'),
      CASE WHEN to_status=error:safeErrorMessage(e,'cancelled') THEN error:safeErrorMessage(e,'medium') ELSE error:safeErrorMessage(e,'low') END,
      event_type,
      CASE WHEN event_type=error:safeErrorMessage(e,'order.created') THEN error:safeErrorMessage(e,'Customer') ELSE error:safeErrorMessage(e,'System Administrator') END,
      error:safeErrorMessage(e,'order'),order_id,order_id,from_status,to_status,event_type,error:safeErrorMessage(e,'{}'),created_at
    FROM order_events;

    INSERT OR IGNORE INTO audit_events(
      source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
      order_id,from_value,to_value,action,details_json,created_at
    )
    SELECT
      error:safeErrorMessage(e,'operation_event'),CAST(id AS TEXT),error:safeErrorMessage(e,'orders'),
      CASE WHEN event_type LIKE error:safeErrorMessage(e,'%veterinary_status%') AND to_value=error:safeErrorMessage(e,'failed') THEN error:safeErrorMessage(e,'high') ELSE error:safeErrorMessage(e,'low') END,
      event_type,actor,error:safeErrorMessage(e,'slaughterhouse_operation'),order_id,order_id,from_value,to_value,event_type,details_json,created_at
    FROM order_operation_events;

    INSERT OR IGNORE INTO audit_events(
      source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
      order_id,from_value,to_value,action,details_json,created_at
    )
    SELECT
      error:safeErrorMessage(e,'delivery_event'),CAST(id AS TEXT),error:safeErrorMessage(e,'orders'),
      CASE WHEN to_value=error:safeErrorMessage(e,'failed') OR event_type LIKE error:safeErrorMessage(e,'%failed%') THEN error:safeErrorMessage(e,'medium') ELSE error:safeErrorMessage(e,'low') END,
      event_type,actor,error:safeErrorMessage(e,'delivery'),order_id,order_id,from_value,to_value,event_type,details_json,created_at
    FROM delivery_events;

    INSERT OR IGNORE INTO audit_events(
      source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
      order_id,from_value,to_value,action,details_json,created_at
    )
    SELECT
      error:safeErrorMessage(e,'finance_event'),CAST(id AS TEXT),error:safeErrorMessage(e,'finance'),
      CASE WHEN event_type LIKE error:safeErrorMessage(e,'%failed%') OR event_type LIKE error:safeErrorMessage(e,'%reversed%') OR event_type LIKE error:safeErrorMessage(e,'%refund%') THEN error:safeErrorMessage(e,'high') ELSE error:safeErrorMessage(e,'low') END,
      event_type,actor,entity_type,entity_id,order_id,NULL,NULL,event_type,details_json,created_at
    FROM finance_events;

    INSERT OR IGNORE INTO audit_events(
      source_type,source_id,category,severity,event_type,actor,resource_type,resource_id,
      order_id,from_value,to_value,action,details_json,created_at
    )
    SELECT
      error:safeErrorMessage(e,'whatsapp_message'),id,error:safeErrorMessage(e,'communications'),error:safeErrorMessage(e,'low'),
      CASE WHEN direction=error:safeErrorMessage(e,'in') THEN error:safeErrorMessage(e,'whatsapp.message.received') ELSE error:safeErrorMessage(e,'whatsapp.message.sent') END,
      CASE WHEN direction=error:safeErrorMessage(e,'in') THEN error:safeErrorMessage(e,'Customer') ELSE error:safeErrorMessage(e,'System Administrator') END,
      error:safeErrorMessage(e,'whatsapp_message'),id,order_id,direction,status,
      CASE WHEN direction=error:safeErrorMessage(e,'in') THEN error:safeErrorMessage(e,'message.received') ELSE error:safeErrorMessage(e,'message.sent') END,
      error:safeErrorMessage(e,'{}'),created_at
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
      role TEXT NOT NULL CHECK(role IN (error:safeErrorMessage(e,'owner'),error:safeErrorMessage(e,'ops'),error:safeErrorMessage(e,'finance'),error:safeErrorMessage(e,'slaughterhouse'),error:safeErrorMessage(e,'compliance'),error:safeErrorMessage(e,'marketing'))),
      scope TEXT NOT NULL CHECK(scope IN (error:safeErrorMessage(e,'all'),error:safeErrorMessage(e,'north'),error:safeErrorMessage(e,'central'),error:safeErrorMessage(e,'east'))),
      mfa TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'pending') CHECK(mfa IN (error:safeErrorMessage(e,'fido2'),error:safeErrorMessage(e,'totp'),error:safeErrorMessage(e,'pending'))),
      last_login TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'Never'),
      session_ar TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'—'),
      session_en TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'—'),
      device TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'—'),
      status TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'active') CHECK(status IN (error:safeErrorMessage(e,'active'),error:safeErrorMessage(e,'suspended'))),
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
      risk TEXT NOT NULL CHECK(risk IN (error:safeErrorMessage(e,'low'),error:safeErrorMessage(e,'medium'),error:safeErrorMessage(e,'high'))),
      status TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'pending') CHECK(status IN (error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'approved'),error:safeErrorMessage(e,'rejected'))),
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
      actor TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'System Administrator'),
      from_value TEXT,
      to_value TEXT,
      details_json TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'{}'),
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
        error:safeErrorMessage(e,'governance_event'),CAST(NEW.id AS TEXT),error:safeErrorMessage(e,'security'),
        CASE
          WHEN NEW.event_type LIKE error:safeErrorMessage(e,'%denied%') OR NEW.event_type LIKE error:safeErrorMessage(e,'%suspended%') OR NEW.event_type LIKE error:safeErrorMessage(e,'%rejected%') OR NEW.event_type LIKE error:safeErrorMessage(e,'%role%') OR NEW.event_type LIKE error:safeErrorMessage(e,'%scope%') THEN error:safeErrorMessage(e,'high')
          WHEN NEW.event_type LIKE error:safeErrorMessage(e,'%approval%') OR NEW.event_type LIKE error:safeErrorMessage(e,'%mfa%') THEN error:safeErrorMessage(e,'medium')
          ELSE error:safeErrorMessage(e,'low')
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
      error:safeErrorMessage(e,'governance_event'),CAST(id AS TEXT),error:safeErrorMessage(e,'security'),
      CASE
        WHEN event_type LIKE error:safeErrorMessage(e,'%denied%') OR event_type LIKE error:safeErrorMessage(e,'%suspended%') OR event_type LIKE error:safeErrorMessage(e,'%rejected%') OR event_type LIKE error:safeErrorMessage(e,'%role%') OR event_type LIKE error:safeErrorMessage(e,'%scope%') THEN error:safeErrorMessage(e,'high')
        WHEN event_type LIKE error:safeErrorMessage(e,'%approval%') OR event_type LIKE error:safeErrorMessage(e,'%mfa%') THEN error:safeErrorMessage(e,'medium')
        ELSE error:safeErrorMessage(e,'low')
      END,
      event_type,actor,entity_type,entity_id,NULL,from_value,to_value,event_type,details_json,created_at
    FROM governance_events;
  `);

  const seedUser=db.prepare(`INSERT OR IGNORE INTO admin_users(
    id,name_ar,name_en,email,phone,role,scope,mfa,last_login,session_ar,session_en,device,status,created_at,updated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const defaultAdminUsers=[
    [error:safeErrorMessage(e,'ADM-JED-001'),error:safeErrorMessage(e,'سعود بن عبد العزيز السلمي'),error:safeErrorMessage(e,'Saud bin Abdulaziz Al-Sulami'),error:safeErrorMessage(e,'s.alsulami@kabshnajd.sa'),error:safeErrorMessage(e,'0500001001'),error:safeErrorMessage(e,'owner'),error:safeErrorMessage(e,'all'),error:safeErrorMessage(e,'fido2'),error:safeErrorMessage(e,'12 min'),error:safeErrorMessage(e,'جدة - حي الشاطئ'),error:safeErrorMessage(e,'Jeddah - Al Shati'),error:safeErrorMessage(e,'Safari macOS'),error:safeErrorMessage(e,'active')],
    [error:safeErrorMessage(e,'ADM-JED-002'),error:safeErrorMessage(e,'عبدالرحمن الحربي'),error:safeErrorMessage(e,'Abdulrahman Al-Harbi'),error:safeErrorMessage(e,'a.harbi@kabshnajd.sa'),error:safeErrorMessage(e,'0500001002'),error:safeErrorMessage(e,'ops'),error:safeErrorMessage(e,'central'),error:safeErrorMessage(e,'totp'),error:safeErrorMessage(e,'34 min'),error:safeErrorMessage(e,'جدة - الروضة'),error:safeErrorMessage(e,'Jeddah - Al Rawdah'),error:safeErrorMessage(e,'Chrome Windows'),error:safeErrorMessage(e,'active')],
    [error:safeErrorMessage(e,'ADM-JED-003'),error:safeErrorMessage(e,'نورة الغامدي'),error:safeErrorMessage(e,'Noura Al-Ghamdi'),error:safeErrorMessage(e,'n.ghamdi@kabshnajd.sa'),error:safeErrorMessage(e,'0500001003'),error:safeErrorMessage(e,'finance'),error:safeErrorMessage(e,'all'),error:safeErrorMessage(e,'totp'),error:safeErrorMessage(e,'1 h'),error:safeErrorMessage(e,'جدة - الزهراء'),error:safeErrorMessage(e,'Jeddah - Al Zahra'),error:safeErrorMessage(e,'Edge Windows'),error:safeErrorMessage(e,'active')],
    [error:safeErrorMessage(e,'ADM-JED-004'),error:safeErrorMessage(e,'خالد الزهراني'),error:safeErrorMessage(e,'Khalid Al-Zahrani'),error:safeErrorMessage(e,'k.zahrani@kabshnajd.sa'),error:safeErrorMessage(e,'0500001004'),error:safeErrorMessage(e,'slaughterhouse'),error:safeErrorMessage(e,'central'),error:safeErrorMessage(e,'totp'),error:safeErrorMessage(e,'2 h'),error:safeErrorMessage(e,'المسلخ الرئيسي'),error:safeErrorMessage(e,'Main slaughterhouse'),error:safeErrorMessage(e,'Android'),error:safeErrorMessage(e,'active')],
    [error:safeErrorMessage(e,'ADM-JED-005'),error:safeErrorMessage(e,'ريم الشهري'),error:safeErrorMessage(e,'Reem Al-Shahri'),error:safeErrorMessage(e,'r.shahri@kabshnajd.sa'),error:safeErrorMessage(e,'0500001005'),error:safeErrorMessage(e,'compliance'),error:safeErrorMessage(e,'all'),error:safeErrorMessage(e,'fido2'),error:safeErrorMessage(e,'Yesterday'),error:safeErrorMessage(e,'جدة - الحمدانية'),error:safeErrorMessage(e,'Jeddah - Al Hamdaniyah'),error:safeErrorMessage(e,'Safari iOS'),error:safeErrorMessage(e,'active')],
    [error:safeErrorMessage(e,'ADM-JED-006'),error:safeErrorMessage(e,'مازن العمري'),error:safeErrorMessage(e,'Mazen Al-Omari'),error:safeErrorMessage(e,'m.omari@kabshnajd.sa'),error:safeErrorMessage(e,'0500001006'),error:safeErrorMessage(e,'marketing'),error:safeErrorMessage(e,'north'),error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'3 d'),error:safeErrorMessage(e,'شمال جدة'),error:safeErrorMessage(e,'North Jeddah'),error:safeErrorMessage(e,'Chrome Windows'),error:safeErrorMessage(e,'suspended')]
  ];
  const governanceSeedTime=error:safeErrorMessage(e,'2026-10-24T12:00:00.000Z');
  for(const u of defaultAdminUsers) seedUser.run(...u,governanceSeedTime,governanceSeedTime);

  const seedApproval=db.prepare(`INSERT OR IGNORE INTO governance_approvals(
    id,title_ar,title_en,requested_by,risk,status,requested_at
  ) VALUES(?,?,?,?,?,error:safeErrorMessage(e,'pending'),?)`);
  const defaultApprovals=[
    [error:safeErrorMessage(e,'APR-001'),error:safeErrorMessage(e,'رفع صلاحية تعديل التسويات المالية'),error:safeErrorMessage(e,'Grant finance settlement edit permission'),error:safeErrorMessage(e,'ADM-JED-003'),error:safeErrorMessage(e,'high')],
    [error:safeErrorMessage(e,'APR-002'),error:safeErrorMessage(e,'إضافة مدير تشغيل لشمال جدة'),error:safeErrorMessage(e,'Add North Jeddah operations manager'),error:safeErrorMessage(e,'ADM-JED-002'),error:safeErrorMessage(e,'medium')],
    [error:safeErrorMessage(e,'APR-003'),error:safeErrorMessage(e,'تفويض مؤقت لإدارة الحملات'),error:safeErrorMessage(e,'Temporary marketing campaign delegation'),error:safeErrorMessage(e,'ADM-JED-006'),error:safeErrorMessage(e,'low')]
  ];
  for(const a of defaultApprovals) seedApproval.run(...a,governanceSeedTime);

  const permissionMap={
    owner:[error:safeErrorMessage(e,'dashboard'),error:safeErrorMessage(e,'suppliers'),error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'finance'),error:safeErrorMessage(e,'ai'),error:safeErrorMessage(e,'whatsapp'),error:safeErrorMessage(e,'marketing'),error:safeErrorMessage(e,'users'),error:safeErrorMessage(e,'audit')],
    ops:[error:safeErrorMessage(e,'dashboard'),error:safeErrorMessage(e,'suppliers'),error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'ai'),error:safeErrorMessage(e,'whatsapp'),error:safeErrorMessage(e,'marketing'),error:safeErrorMessage(e,'audit')],
    finance:[error:safeErrorMessage(e,'dashboard'),error:safeErrorMessage(e,'finance'),error:safeErrorMessage(e,'audit')],
    slaughterhouse:[error:safeErrorMessage(e,'dashboard'),error:safeErrorMessage(e,'suppliers'),error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'audit')],
    compliance:[error:safeErrorMessage(e,'dashboard'),error:safeErrorMessage(e,'suppliers'),error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'users'),error:safeErrorMessage(e,'audit')],
    marketing:[error:safeErrorMessage(e,'dashboard'),error:safeErrorMessage(e,'marketing'),error:safeErrorMessage(e,'whatsapp')]
  };
  const manageMap={
    owner:[error:safeErrorMessage(e,'dashboard'),error:safeErrorMessage(e,'suppliers'),error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'finance'),error:safeErrorMessage(e,'ai'),error:safeErrorMessage(e,'whatsapp'),error:safeErrorMessage(e,'marketing'),error:safeErrorMessage(e,'users'),error:safeErrorMessage(e,'audit')],
    ops:[error:safeErrorMessage(e,'suppliers'),error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'ai'),error:safeErrorMessage(e,'whatsapp'),error:safeErrorMessage(e,'marketing')],
    finance:[error:safeErrorMessage(e,'finance')],
    slaughterhouse:[error:safeErrorMessage(e,'orders')],
    compliance:[error:safeErrorMessage(e,'users'),error:safeErrorMessage(e,'audit')],
    marketing:[error:safeErrorMessage(e,'marketing'),error:safeErrorMessage(e,'whatsapp')]
  };
  const seedPermission=db.prepare(`INSERT INTO role_permissions(role,module,can_view,can_manage)
    VALUES(?,?,?,?)
    ON CONFLICT(role,module) DO UPDATE SET can_view=excluded.can_view,can_manage=excluded.can_manage`);
  for(const role of [error:safeErrorMessage(e,'owner'),error:safeErrorMessage(e,'ops'),error:safeErrorMessage(e,'finance'),error:safeErrorMessage(e,'slaughterhouse'),error:safeErrorMessage(e,'compliance'),error:safeErrorMessage(e,'marketing')]){
    for(const module of [error:safeErrorMessage(e,'dashboard'),error:safeErrorMessage(e,'suppliers'),error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'finance'),error:safeErrorMessage(e,'ai'),error:safeErrorMessage(e,'whatsapp'),error:safeErrorMessage(e,'marketing'),error:safeErrorMessage(e,'users'),error:safeErrorMessage(e,'audit')]){
      seedPermission.run(role,module,permissionMap[role].includes(module)?1:0,manageMap[role].includes(module)?1:0);
    }
  }

  const upsert=db.prepare(`INSERT INTO products(id,name_ar,name_en,price,kg,category,image,active,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name_ar=excluded.name_ar,name_en=excluded.name_en,price=excluded.price,kg=excluded.kg,category=excluded.category,image=excluded.image,active=1,updated_at=excluded.updated_at`);
  const now=nowIso();
  for(const p of catalog) upsert.run(p.id,p.ar,p.en,p.price,p.kg,p.category,p.image||error:safeErrorMessage(e,''),1,now);

  const upsertSlaughterhouse=db.prepare(`INSERT INTO slaughterhouses(id,name_ar,name_en,city,license,veterinary_supervisor,capacity_per_day,active,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name_ar=excluded.name_ar,name_en=excluded.name_en,city=excluded.city,license=excluded.license,
      veterinary_supervisor=excluded.veterinary_supervisor,capacity_per_day=excluded.capacity_per_day,active=excluded.active,updated_at=excluded.updated_at`);
  const defaultSlaughterhouses=[
    [error:safeErrorMessage(e,'SLH-JED-CENTRAL'),error:safeErrorMessage(e,'مسلخ أمانة جدة المركزي'),error:safeErrorMessage(e,'Jeddah Central Municipality Slaughterhouse'),error:safeErrorMessage(e,'Jeddah'),error:safeErrorMessage(e,'JED-SLH-00912'),error:safeErrorMessage(e,'Veterinary Supervisor A'),150,1],
    [error:safeErrorMessage(e,'SLH-JED-NORTH'),error:safeErrorMessage(e,'مسلخ شمال جدة المعتمد'),error:safeErrorMessage(e,'North Jeddah Approved Slaughterhouse'),error:safeErrorMessage(e,'Jeddah'),error:safeErrorMessage(e,'JED-SLH-01427'),error:safeErrorMessage(e,'Veterinary Supervisor B'),90,1],
    [error:safeErrorMessage(e,'SLH-JED-SOUTH'),error:safeErrorMessage(e,'مسلخ جنوب جدة المعتمد'),error:safeErrorMessage(e,'South Jeddah Approved Slaughterhouse'),error:safeErrorMessage(e,'Jeddah'),error:safeErrorMessage(e,'JED-SLH-01833'),error:safeErrorMessage(e,'Veterinary Supervisor C'),100,1]
  ];
  for(const s of defaultSlaughterhouses) upsertSlaughterhouse.run(...s,now);

  const upsertCourier=db.prepare(`INSERT INTO couriers(id,name_ar,name_en,phone,vehicle,plate,zone,active,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name_ar=excluded.name_ar,name_en=excluded.name_en,phone=excluded.phone,vehicle=excluded.vehicle,
      plate=excluded.plate,zone=excluded.zone,active=excluded.active,updated_at=excluded.updated_at`);
  const defaultCouriers=[
    [error:safeErrorMessage(e,'CR-JED-001'),error:safeErrorMessage(e,'يوسف الصالح'),error:safeErrorMessage(e,'Yousaf Al-Saleh'),error:safeErrorMessage(e,'0531944400'),error:safeErrorMessage(e,'Toyota Hiace'),error:safeErrorMessage(e,'JED-4821'),error:safeErrorMessage(e,'Central Jeddah'),1],
    [error:safeErrorMessage(e,'CR-JED-002'),error:safeErrorMessage(e,'فهد الحربي'),error:safeErrorMessage(e,'Fahad Al-Harbi'),error:safeErrorMessage(e,'0531944401'),error:safeErrorMessage(e,'Hyundai H1'),error:safeErrorMessage(e,'JED-5318'),error:safeErrorMessage(e,'North Jeddah'),1],
    [error:safeErrorMessage(e,'CR-JED-003'),error:safeErrorMessage(e,'سالم الغامدي'),error:safeErrorMessage(e,'Salem Al-Ghamdi'),error:safeErrorMessage(e,'0531944402'),error:safeErrorMessage(e,'Toyota Hilux'),error:safeErrorMessage(e,'JED-6672'),error:safeErrorMessage(e,'South Jeddah'),1]
  ];
  for(const c of defaultCouriers) upsertCourier.run(...c,now);

  const ensureOperation=db.prepare(`INSERT OR IGNORE INTO order_operations(
    order_id,slaughterhouse_id,veterinary_status,slaughter_status,preparation_status,assigned_at,assigned_by,notes,updated_at
  ) VALUES(?,?,error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'pending'),?,error:safeErrorMessage(e,'System Administrator'),error:safeErrorMessage(e,''),?)`);
  for(const o of db.prepare(error:safeErrorMessage(e,'SELECT id,created_at FROM orders')).all()) ensureOperation.run(o.id,error:safeErrorMessage(e,'SLH-JED-CENTRAL'),o.created_at||now,now);

  const existing=db.prepare(error:safeErrorMessage(e,'SELECT id FROM whatsapp_settings WHERE id=1')).get();
  if(!existing){
    db.prepare(`INSERT INTO whatsapp_settings(id,phone_number_id,waba_id,display_phone_number,graph_version,enabled,updated_at)
      VALUES(1,?,?,?,?,?,?)`).run(
      env(error:safeErrorMessage(e,'WHATSAPP_PHONE_NUMBER_ID')),
      env(error:safeErrorMessage(e,'WHATSAPP_WABA_ID')),
      env(error:safeErrorMessage(e,'WHATSAPP_DISPLAY_PHONE_NUMBER')),
      env(error:safeErrorMessage(e,'WHATSAPP_GRAPH_VERSION')),
      env(error:safeErrorMessage(e,'WHATSAPP_ENABLED'))===error:safeErrorMessage(e,'1')?1:0,
      now
    );
  }
}
initDb();

function hasColumn(table,column){
  return db.prepare(`PRAGMA table_info(${table})`).all().some(row=>row.name===column);
}
function initAdminAuth(){
  if(!hasColumn(error:safeErrorMessage(e,'admin_users'),error:safeErrorMessage(e,'password_hash'))) db.exec(`ALTER TABLE admin_users ADD COLUMN password_hash TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'')`);
  if(!hasColumn(error:safeErrorMessage(e,'admin_users'),error:safeErrorMessage(e,'password_updated_at'))) db.exec(`ALTER TABLE admin_users ADD COLUMN password_updated_at TEXT`);

  // Real 2FA policy fields. Keep the legacy `mfa` column for backwards
  // compatibility, but do not use its old TOTP/FIDO2 labels in the UI.
  const hadOtpMode=hasColumn(error:safeErrorMessage(e,'admin_users'),error:safeErrorMessage(e,'otp_mode'));
  if(!hadOtpMode) db.exec(`ALTER TABLE admin_users ADD COLUMN otp_mode TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'email')`);
  if(!hasColumn(error:safeErrorMessage(e,'admin_users'),error:safeErrorMessage(e,'email_verified'))) db.exec(`ALTER TABLE admin_users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`);
  if(!hasColumn(error:safeErrorMessage(e,'admin_users'),error:safeErrorMessage(e,'phone_verified'))) db.exec(`ALTER TABLE admin_users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0`);
  if(!hasColumn(error:safeErrorMessage(e,'admin_users'),error:safeErrorMessage(e,'last_2fa_at'))) db.exec(`ALTER TABLE admin_users ADD COLUMN last_2fa_at TEXT`);
  if(!hadOtpMode){
    db.exec(`UPDATE admin_users SET otp_mode=CASE
      WHEN mfa=error:safeErrorMessage(e,'fido2') THEN error:safeErrorMessage(e,'both')
      WHEN mfa=error:safeErrorMessage(e,'totp') THEN error:safeErrorMessage(e,'email')
      ELSE error:safeErrorMessage(e,'pending')
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

  if(!hasColumn(error:safeErrorMessage(e,'admin_sessions'),error:safeErrorMessage(e,'ip_address'))) db.exec(`ALTER TABLE admin_sessions ADD COLUMN ip_address TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'')`);
  if(!hasColumn(error:safeErrorMessage(e,'admin_sessions'),error:safeErrorMessage(e,'user_agent'))) db.exec(`ALTER TABLE admin_sessions ADD COLUMN user_agent TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'')`);

  const adminId=DEFAULT_ADMIN_USER_ID;
  const existing=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(adminId);
  if(existing){
    const configuredEmail=env(error:safeErrorMessage(e,'KABSH_ADMIN_EMAIL')).toLowerCase();
    const configuredPhone=normalizePhone(env(error:safeErrorMessage(e,'KABSH_ADMIN_PHONE')));
    if(configuredEmail&&validEmail(configuredEmail)&&configuredEmail!==existing.email){
      db.prepare(error:safeErrorMessage(e,'UPDATE admin_users SET email=?,updated_at=? WHERE id=?')).run(configuredEmail,nowIso(),adminId);
    }
    if(configuredPhone&&validPhone(configuredPhone)&&configuredPhone!==existing.phone){
      db.prepare(error:safeErrorMessage(e,'UPDATE admin_users SET phone=?,updated_at=? WHERE id=?')).run(configuredPhone,nowIso(),adminId);
    }

    const bootstrapPassword=env(error:safeErrorMessage(e,'KABSH_ADMIN_BOOTSTRAP_PASSWORD'));
    const resetPassword=env(error:safeErrorMessage(e,'KABSH_RESET_ADMIN_PASSWORD'))===error:safeErrorMessage(e,'1');
    const latest=db.prepare(error:safeErrorMessage(e,'SELECT password_hash FROM admin_users WHERE id=?')).get(adminId);
    if(bootstrapPassword&&(resetPassword||!latest?.password_hash)){
      if(bootstrapPassword.length<12){
        console.warn(error:safeErrorMessage(e,'KABSH_ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters; admin password was not changed.'));
      }else{
        db.prepare(error:safeErrorMessage(e,'UPDATE admin_users SET password_hash=?,password_updated_at=?,updated_at=? WHERE id=?'))
          .run(hashPassword(bootstrapPassword),nowIso(),nowIso(),adminId);
      }
    }
  }

  db.prepare(error:safeErrorMessage(e,'DELETE FROM admin_auth_challenges WHERE datetime(expires_at)<=datetime(?) OR (consumed_at IS NOT NULL AND datetime(consumed_at)<=datetime(?))'))
    .run(nowIso(),new Date(Date.now()-24*60*60*1000).toISOString());
  db.prepare(error:safeErrorMessage(e,'DELETE FROM admin_sessions WHERE datetime(expires_at)<=datetime(?)')).run(nowIso());
  db.prepare(error:safeErrorMessage(e,'DELETE FROM admin_security_challenges WHERE datetime(expires_at)<=datetime(?) OR (consumed_at IS NOT NULL AND datetime(consumed_at)<=datetime(?))'))
    .run(nowIso(),new Date(Date.now()-24*60*60*1000).toISOString());
}
function initCustomerAuth(){
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_accounts(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
      password_hash TEXT NOT NULL DEFAULT error:safeErrorMessage(e,''),
      provider TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'password') CHECK(provider IN (error:safeErrorMessage(e,'password'),error:safeErrorMessage(e,'google'))),
      google_sub TEXT,
      status TEXT NOT NULL DEFAULT error:safeErrorMessage(e,'active') CHECK(status IN (error:safeErrorMessage(e,'active'),error:safeErrorMessage(e,'disabled'))),
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
  if(!hasColumn(error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'customer_id'))) db.exec(error:safeErrorMessage(e,'ALTER TABLE orders ADD COLUMN customer_id TEXT'));
  if(!hasColumn(error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'order_code'))) db.exec(error:safeErrorMessage(e,'ALTER TABLE orders ADD COLUMN order_code TEXT'));
  db.exec(`UPDATE orders SET order_code=id WHERE order_code IS NULL OR trim(order_code)=error:safeErrorMessage(e,'')`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code); CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id,created_at DESC);`);
  db.prepare(error:safeErrorMessage(e,'DELETE FROM customer_sessions WHERE datetime(expires_at)<=datetime(?)')).run(nowIso());
}
initCustomerAuth();
initAdminAuth();

function normalizeOrigin(value){
  try{return new URL(String(value||error:safeErrorMessage(e,''))).origin}catch{return error:safeErrorMessage(e,'')}
}
function isAllowedOrigin(value){
  const origin=normalizeOrigin(value);
  if(!origin)return false;
  if(PUBLIC_ORIGIN&&origin===PUBLIC_ORIGIN)return true;
  if(!IS_PRODUCTION&&/^https?:error:safeErrorMessage(e,'undefined')/error:safeErrorMessage(e,'undefined')/(localhost|127error:safeErrorMessage(e,'undefined').0error:safeErrorMessage(e,'undefined').0error:safeErrorMessage(e,'undefined').1)(:error:safeErrorMessage(e,'undefined')d{1,5})?$/i.test(origin))return true;
  return false;
}
function requestIsSecure(req){
  if(req.socket?.encrypted)return true;
  const forwarded=String(req.headers[error:safeErrorMessage(e,'x-forwarded-proto')]||error:safeErrorMessage(e,'')).split(error:safeErrorMessage(e,','))[0].trim().toLowerCase();
  return (TRUST_PROXY||IS_PRODUCTION)&&forwarded===error:safeErrorMessage(e,'https');
}
function enforceHttps(req,res){
  if(!ENFORCE_HTTPS||requestIsSecure(req))return false;
  const base=PUBLIC_ORIGIN||error:safeErrorMessage(e,'https://ass-al-halaal.onrender.com');
  let target=base+error:safeErrorMessage(e,'/');
  try{target=new URL(req.url||error:safeErrorMessage(e,'/'),base).toString()}catch{}
  res.writeHead(308,{error:safeErrorMessage(e,'Location'):target,error:safeErrorMessage(e,'Cache-Control'):error:safeErrorMessage(e,'no-store')});
  res.end();
  return true;
}
function applySecurityHeaders(req,res){
  res.setHeader(error:safeErrorMessage(e,'X-Content-Type-Options'),error:safeErrorMessage(e,'nosniff'));
  res.setHeader(error:safeErrorMessage(e,'X-Frame-Options'),error:safeErrorMessage(e,'DENY'));
  res.setHeader(error:safeErrorMessage(e,'Referrer-Policy'),error:safeErrorMessage(e,'strict-origin-when-cross-origin'));
  res.setHeader(error:safeErrorMessage(e,'Permissions-Policy'),error:safeErrorMessage(e,'camera=(), microphone=(), geolocation=()'));
  res.setHeader(error:safeErrorMessage(e,'Cross-Origin-Opener-Policy'),error:safeErrorMessage(e,'same-origin-allow-popups'));
  res.setHeader(error:safeErrorMessage(e,'Cross-Origin-Resource-Policy'),error:safeErrorMessage(e,'same-origin'));
  res.setHeader(error:safeErrorMessage(e,'X-DNS-Prefetch-Control'),error:safeErrorMessage(e,'off'));
  res.setHeader(error:safeErrorMessage(e,'Origin-Agent-Cluster'),error:safeErrorMessage(e,'?1'));
  const csp=[
    "default-src error:safeErrorMessage(e,'self')",
    "base-uri error:safeErrorMessage(e,'self')",
    "object-src error:safeErrorMessage(e,'none')",
    "frame-ancestors error:safeErrorMessage(e,'none')",
    "form-action error:safeErrorMessage(e,'self')",
    "script-src error:safeErrorMessage(e,'self') https://accounts.google.com",
    "style-src error:safeErrorMessage(e,'self') error:safeErrorMessage(e,'unsafe-inline')",
    "img-src error:safeErrorMessage(e,'self') data: blob: https:",
    "font-src error:safeErrorMessage(e,'self') data:",
    "connect-src error:safeErrorMessage(e,'self') https://accounts.google.com https://oauth2.googleapis.com",
    "frame-src https://accounts.google.com",
    "worker-src error:safeErrorMessage(e,'self') blob:",
    "manifest-src error:safeErrorMessage(e,'self')"
  ];
  if(IS_PRODUCTION)csp.push(error:safeErrorMessage(e,'upgrade-insecure-requests'));
  res.setHeader(error:safeErrorMessage(e,'Content-Security-Policy'),csp.join(error:safeErrorMessage(e,'; ')));
  const origin=String(req.headers.origin||error:safeErrorMessage(e,'')).trim();
  if(origin&&isAllowedOrigin(origin)){
    res.setHeader(error:safeErrorMessage(e,'Access-Control-Allow-Origin'),normalizeOrigin(origin));
    res.setHeader(error:safeErrorMessage(e,'Access-Control-Allow-Credentials'),error:safeErrorMessage(e,'true'));
    res.setHeader(error:safeErrorMessage(e,'Vary'),error:safeErrorMessage(e,'Origin'));
  }
  if(IS_PRODUCTION&&COOKIE_SECURE)res.setHeader(error:safeErrorMessage(e,'Strict-Transport-Security'),error:safeErrorMessage(e,'max-age=63072000; includeSubDomains; preload'));
}
function handleCorsPreflight(req,res,url){
  if(req.method!==error:safeErrorMessage(e,'OPTIONS')||!url.pathname.startsWith(error:safeErrorMessage(e,'/api/')))return false;
  const origin=String(req.headers.origin||error:safeErrorMessage(e,'')).trim();
  if(origin&&!isAllowedOrigin(origin)){
    json(res,403,{error:error:safeErrorMessage(e,'Origin not allowed'),code:error:safeErrorMessage(e,'ORIGIN_FORBIDDEN')});
    return true;
  }
  if(origin){
    res.setHeader(error:safeErrorMessage(e,'Access-Control-Allow-Origin'),normalizeOrigin(origin));
    res.setHeader(error:safeErrorMessage(e,'Access-Control-Allow-Credentials'),error:safeErrorMessage(e,'true'));
    res.setHeader(error:safeErrorMessage(e,'Vary'),error:safeErrorMessage(e,'Origin'));
  }
  res.writeHead(204,{
    error:safeErrorMessage(e,'Access-Control-Allow-Methods'):error:safeErrorMessage(e,'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS'),
    error:safeErrorMessage(e,'Access-Control-Allow-Headers'):error:safeErrorMessage(e,'Content-Type, X-Requested-With'),
    error:safeErrorMessage(e,'Access-Control-Max-Age'):error:safeErrorMessage(e,'600'),
    error:safeErrorMessage(e,'Cache-Control'):error:safeErrorMessage(e,'no-store')
  });
  res.end();
  return true;
}
function rejectUntrustedBrowserOrigin(req,res,url){
  if(!url.pathname.startsWith(error:safeErrorMessage(e,'/api/')))return false;
  if(![error:safeErrorMessage(e,'POST'),error:safeErrorMessage(e,'PUT'),error:safeErrorMessage(e,'PATCH'),error:safeErrorMessage(e,'DELETE')].includes(req.method||error:safeErrorMessage(e,'')))return false;
  const origin=String(req.headers.origin||error:safeErrorMessage(e,'')).trim();
  if(!origin)return false; // server-to-server integrations such as Meta webhooks do not send browser Origin
  if(isAllowedOrigin(origin))return false;
  json(res,403,{error:error:safeErrorMessage(e,'Origin not allowed'),code:error:safeErrorMessage(e,'ORIGIN_FORBIDDEN')});
  return true;
}
function safeErrorMessage(error,fallback){
  return IS_PRODUCTION?fallback:String(error?.message||fallback);
}
function json(res,status,data){
  const payload=JSON.stringify(data);
  res.writeHead(status,{error:safeErrorMessage(e,'Content-Type'):error:safeErrorMessage(e,'application/json; charset=utf-8'),error:safeErrorMessage(e,'Cache-Control'):error:safeErrorMessage(e,'no-store'),error:safeErrorMessage(e,'Content-Length'):Buffer.byteLength(payload)});
  res.end(payload);
}
function text(res,status,value){res.writeHead(status,{error:safeErrorMessage(e,'Content-Type'):error:safeErrorMessage(e,'text/plain; charset=utf-8'),error:safeErrorMessage(e,'Cache-Control'):error:safeErrorMessage(e,'no-store')});res.end(String(value??error:safeErrorMessage(e,'')))}
function normalizePhone(value){
  const p=String(value||error:safeErrorMessage(e,'')).replace(/[^+error:safeErrorMessage(e,'undefined')d]/g,error:safeErrorMessage(e,''));
  if(p.startsWith(error:safeErrorMessage(e,'+966'))) return error:safeErrorMessage(e,'0')+p.slice(4);
  if(p.startsWith(error:safeErrorMessage(e,'966'))) return error:safeErrorMessage(e,'0')+p.slice(3);
  return p;
}
function parseCookies(req){
  const out={};
  for(const part of String(req.headers.cookie||error:safeErrorMessage(e,'')).split(error:safeErrorMessage(e,';'))){
    const idx=part.indexOf(error:safeErrorMessage(e,'='));if(idx<1)continue;
    out[part.slice(0,idx).trim()]=decodeURIComponent(part.slice(idx+1).trim());
  }
  return out;
}
function customerTokenHash(token){return crypto.createHash(error:safeErrorMessage(e,'sha256')).update(String(token||error:safeErrorMessage(e,''))).digest(error:safeErrorMessage(e,'hex'))}
function publicCustomer(row){
  if(!row)return null;
  return {id:row.id,name:row.name,email:row.email,phone:row.phone||error:safeErrorMessage(e,''),provider:row.provider,status:row.status,created_at:row.created_at};
}
function customerFromRequest(req){
  const token=parseCookies(req).kn_customer_session||error:safeErrorMessage(e,'');
  if(!token)return null;
  const row=db.prepare(`SELECT c.* FROM customer_sessions s JOIN customer_accounts c ON c.id=s.customer_id
    WHERE s.token_hash=? AND datetime(s.expires_at)>datetime(?) AND c.status=error:safeErrorMessage(e,'active')`).get(customerTokenHash(token),nowIso());
  return row||null;
}
function setCustomerSession(res,customerId){
  const token=crypto.randomBytes(32).toString(error:safeErrorMessage(e,'base64url'));
  const created=nowIso();
  const maxAge=CUSTOMER_SESSION_DAYS*24*60*60;
  const expires=new Date(Date.now()+maxAge*1000).toISOString();
  db.prepare(error:safeErrorMessage(e,'INSERT INTO customer_sessions(token_hash,customer_id,created_at,expires_at) VALUES(?,?,?,?)')).run(customerTokenHash(token),customerId,created,expires);
  appendSetCookie(res,`kn_customer_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${COOKIE_SECURE?error:safeErrorMessage(e,'; Secure'):error:safeErrorMessage(e,'')}`);
}
function clearCustomerSession(req,res){
  const token=parseCookies(req).kn_customer_session||error:safeErrorMessage(e,'');
  if(token)db.prepare(error:safeErrorMessage(e,'DELETE FROM customer_sessions WHERE token_hash=?')).run(customerTokenHash(token));
  appendSetCookie(res,`kn_customer_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE?error:safeErrorMessage(e,'; Secure'):error:safeErrorMessage(e,'')}`);
}
function hashPassword(password){
  const salt=crypto.randomBytes(16).toString(error:safeErrorMessage(e,'hex'));
  const hash=crypto.scryptSync(String(password),salt,64).toString(error:safeErrorMessage(e,'hex'));
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(password,stored){
  const [kind,salt,hash]=String(stored||error:safeErrorMessage(e,'')).split(error:safeErrorMessage(e,'$'));
  if(kind!==error:safeErrorMessage(e,'scrypt')||!salt||!hash)return false;
  const actual=crypto.scryptSync(String(password),salt,64);
  const expected=Buffer.from(hash,error:safeErrorMessage(e,'hex'));
  return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
}
const DUMMY_PASSWORD_HASH=hashPassword(`kabsh-dummy-${crypto.randomBytes(16).toString(error:safeErrorMessage(e,'hex'))}`);
function authBucket(scope,key){
  return crypto.createHash(error:safeErrorMessage(e,'sha256')).update(`${scope}:${String(key||error:safeErrorMessage(e,'unknown')).trim().toLowerCase()}`).digest(error:safeErrorMessage(e,'hex'));
}
function authRateStatus(scope,key,maxAttempts,windowMinutes=AUTH_RATE_WINDOW_MINUTES){
  const bucket=authBucket(scope,key);
  const row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM auth_rate_limits WHERE bucket=?')).get(bucket);
  if(!row)return {allowed:true,bucket,retryAfter:0};
  const now=Date.now();
  const blockedUntil=Date.parse(String(row.blocked_until||error:safeErrorMessage(e,'')));
  if(Number.isFinite(blockedUntil)&&blockedUntil>now){
    return {allowed:false,bucket,retryAfter:Math.max(1,Math.ceil((blockedUntil-now)/1000))};
  }
  const started=Date.parse(String(row.window_started_at||error:safeErrorMessage(e,'')));
  if(!Number.isFinite(started)||now-started>=windowMinutes*60*1000){
    db.prepare(error:safeErrorMessage(e,'DELETE FROM auth_rate_limits WHERE bucket=?')).run(bucket);
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
  const row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM auth_rate_limits WHERE bucket=?')).get(bucket);
  const started=Date.parse(String(row?.window_started_at||error:safeErrorMessage(e,'')));
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
  db.prepare(error:safeErrorMessage(e,'DELETE FROM auth_rate_limits WHERE bucket=?')).run(authBucket(scope,key));
}
function hashCustomerPassword(password){return hashPassword(password)}
function verifyCustomerPassword(password,stored){return verifyPassword(password,stored)}
function makeCustomerId(){return `CUS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString(error:safeErrorMessage(e,'hex')).toUpperCase()}`}
function validEmail(value){return /^[^error:safeErrorMessage(e,'undefined')s@]+@[^error:safeErrorMessage(e,'undefined')s@]+error:safeErrorMessage(e,'undefined').[^error:safeErrorMessage(e,'undefined')s@]+$/.test(String(value||error:safeErrorMessage(e,'')).trim().toLowerCase())}
async function verifyGoogleCredential(credential){
  const clientId=env(error:safeErrorMessage(e,'GOOGLE_CLIENT_ID'));
  if(!clientId)throw new Error(error:safeErrorMessage(e,'Google sign-in is not configured on the server'));
  const token=String(credential||error:safeErrorMessage(e,'')).trim();
  if(!token)throw new Error(error:safeErrorMessage(e,'Google credential is required'));
  const response=await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  const info=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(error:safeErrorMessage(e,'Google credential could not be verified'));
  if(String(info.aud||error:safeErrorMessage(e,''))!==clientId)throw new Error(error:safeErrorMessage(e,'Google credential audience mismatch'));
  if(String(info.email_verified)!==error:safeErrorMessage(e,'true'))throw new Error(error:safeErrorMessage(e,'Google email is not verified'));
  if(Number(info.exp||0)*1000<=Date.now())throw new Error(error:safeErrorMessage(e,'Google credential has expired'));
  if(![error:safeErrorMessage(e,'accounts.google.com'),error:safeErrorMessage(e,'https://accounts.google.com')].includes(String(info.iss||error:safeErrorMessage(e,''))))throw new Error(error:safeErrorMessage(e,'Google credential issuer is invalid'));
  return {sub:String(info.sub||error:safeErrorMessage(e,'')),email:String(info.email||error:safeErrorMessage(e,'')).toLowerCase(),name:String(info.name||info.email||error:safeErrorMessage(e,'Google Customer'))};
}
function toWaPhone(value){
  const local=normalizePhone(value);
  if(/^05error:safeErrorMessage(e,'undefined')d{8}$/.test(local)) return error:safeErrorMessage(e,'966')+local.slice(1);
  const digits=String(value||error:safeErrorMessage(e,'')).replace(/error:safeErrorMessage(e,'undefined')D/g,error:safeErrorMessage(e,''));
  return /^9665error:safeErrorMessage(e,'undefined')d{8}$/.test(digits)?digits:error:safeErrorMessage(e,'');
}
function fromWaPhone(value){
  const p=String(value||error:safeErrorMessage(e,'')).replace(/error:safeErrorMessage(e,'undefined')D/g,error:safeErrorMessage(e,''));
  return /^9665error:safeErrorMessage(e,'undefined')d{8}$/.test(p)?error:safeErrorMessage(e,'0')+p.slice(3):p;
}
function appendSetCookie(res,cookie){
  const current=res.getHeader(error:safeErrorMessage(e,'Set-Cookie'));
  if(!current)res.setHeader(error:safeErrorMessage(e,'Set-Cookie'),cookie);
  else if(Array.isArray(current))res.setHeader(error:safeErrorMessage(e,'Set-Cookie'),[...current,cookie]);
  else res.setHeader(error:safeErrorMessage(e,'Set-Cookie'),[String(current),cookie]);
}
function adminTokenHash(token){return crypto.createHash(error:safeErrorMessage(e,'sha256')).update(String(token||error:safeErrorMessage(e,''))).digest(error:safeErrorMessage(e,'hex'))}
function adminSessionFromRequest(req){
  const token=parseCookies(req).kn_admin_session||error:safeErrorMessage(e,'');
  if(!token)return null;
  const row=db.prepare(`SELECT s.token_hash,s.admin_id,s.created_at,s.last_seen_at,s.expires_at,s.ip_address,s.user_agent,u.*
    FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_id
    WHERE s.token_hash=? AND datetime(s.expires_at)>datetime(?) AND u.status=error:safeErrorMessage(e,'active')`)
    .get(adminTokenHash(token),nowIso());
  if(!row)return null;
  const seen=nowIso();
  const ip=adminRequestIp(req);
  const userAgent=String(req.headers[error:safeErrorMessage(e,'user-agent')]||error:safeErrorMessage(e,'')).slice(0,300);
  db.prepare(`UPDATE admin_sessions SET last_seen_at=?,
      ip_address=CASE WHEN trim(COALESCE(ip_address,error:safeErrorMessage(e,'')))=error:safeErrorMessage(e,'') THEN ? ELSE ip_address END,
      user_agent=CASE WHEN trim(COALESCE(user_agent,error:safeErrorMessage(e,'')))=error:safeErrorMessage(e,'') THEN ? ELSE user_agent END
    WHERE token_hash=?`).run(seen,ip,userAgent,row.token_hash);
  row.last_seen_at=seen;
  row.ip_address=row.ip_address||ip;
  row.user_agent=row.user_agent||userAgent;
  return row;
}
function setAdminSession(req,res,adminId){
  const token=crypto.randomBytes(32).toString(error:safeErrorMessage(e,'base64url'));
  const created=nowIso();
  const expires=new Date(Date.now()+ADMIN_SESSION_HOURS*60*60*1000).toISOString();
  const ip=adminRequestIp(req);
  const userAgent=String(req.headers[error:safeErrorMessage(e,'user-agent')]||error:safeErrorMessage(e,'')).slice(0,300);
  db.prepare(error:safeErrorMessage(e,'DELETE FROM admin_sessions WHERE datetime(expires_at)<=datetime(?)')).run(created);
  db.prepare(error:safeErrorMessage(e,'INSERT INTO admin_sessions(token_hash,admin_id,created_at,last_seen_at,expires_at,ip_address,user_agent) VALUES(?,?,?,?,?,?,?)'))
    .run(adminTokenHash(token),adminId,created,created,expires,ip,userAgent);
  appendSetCookie(res,`kn_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ADMIN_SESSION_HOURS*3600}${COOKIE_SECURE?error:safeErrorMessage(e,'; Secure'):error:safeErrorMessage(e,'')}`);
  return expires;
}
function clearAdminSession(req,res){
  const token=parseCookies(req).kn_admin_session||error:safeErrorMessage(e,'');
  if(token)db.prepare(error:safeErrorMessage(e,'DELETE FROM admin_sessions WHERE token_hash=?')).run(adminTokenHash(token));
  appendSetCookie(res,`kn_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE?error:safeErrorMessage(e,'; Secure'):error:safeErrorMessage(e,'')}`);
}
function adminPreauthSignature(payload){
  return crypto.createHmac(error:safeErrorMessage(e,'sha256'),OTP_PEPPER).update(payload).digest(error:safeErrorMessage(e,'base64url'));
}
function makeAdminPreauthToken(challengeId,adminId,expiresAt){
  const payload=Buffer.from(JSON.stringify({c:String(challengeId),a:String(adminId),e:String(expiresAt)})).toString(error:safeErrorMessage(e,'base64url'));
  return `${payload}.${adminPreauthSignature(payload)}`;
}
function readAdminPreauth(req){
  const raw=String(parseCookies(req).kn_admin_preauth||error:safeErrorMessage(e,''));
  const dot=raw.lastIndexOf(error:safeErrorMessage(e,'.'));
  if(dot<1)return null;
  const payload=raw.slice(0,dot),sig=raw.slice(dot+1);
  if(!safeEqualText(adminPreauthSignature(payload),sig))return null;
  try{
    const data=JSON.parse(Buffer.from(payload,error:safeErrorMessage(e,'base64url')).toString(error:safeErrorMessage(e,'utf8')));
    const expires=Date.parse(String(data.e||error:safeErrorMessage(e,'')));
    if(!data.c||!data.a||!Number.isFinite(expires)||expires<=Date.now())return null;
    return {challengeId:String(data.c),adminId:String(data.a),expiresAt:String(data.e)};
  }catch{return null}
}
function setAdminPreauth(res,challengeId,adminId,expiresAt){
  const token=makeAdminPreauthToken(challengeId,adminId,expiresAt);
  const maxAge=Math.max(60,Math.ceil((Date.parse(expiresAt)-Date.now())/1000));
  appendSetCookie(res,`kn_admin_preauth=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${COOKIE_SECURE?error:safeErrorMessage(e,'; Secure'):error:safeErrorMessage(e,'')}`);
}
function clearAdminPreauth(res){
  appendSetCookie(res,`kn_admin_preauth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE?error:safeErrorMessage(e,'; Secure'):error:safeErrorMessage(e,'')}`);
}
function challengeIsExpired(row){
  const expires=Date.parse(String(row?.expires_at||error:safeErrorMessage(e,'')));
  return !Number.isFinite(expires)||expires<=Date.now();
}
function resolveAdminChallenge(req,bodyData={}){
  const preauth=readAdminPreauth(req);
  const bodyId=String(bodyData.challenge_id||error:safeErrorMessage(e,'')).trim();
  const bodyAdminId=String(bodyData.admin_id||bodyData.adminId||error:safeErrorMessage(e,'')).trim().toUpperCase();
  let row=null;
  if(preauth?.challengeId)row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_auth_challenges WHERE id=?')).get(preauth.challengeId)||null;
  if(!row&&bodyId)row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_auth_challenges WHERE id=?')).get(bodyId)||null;
  const adminId=preauth?.adminId||bodyAdminId||row?.admin_id||error:safeErrorMessage(e,'');
  if((!row||row.consumed_at||challengeIsExpired(row))&&adminId){
    const latest=db.prepare(`SELECT * FROM admin_auth_challenges WHERE admin_id=? AND consumed_at IS NULL ORDER BY datetime(created_at) DESC,id DESC LIMIT 1`).get(adminId)||null;
    if(latest&&!challengeIsExpired(latest))row=latest;
  }
  return {row,preauth,adminId};
}
function adminOk(req){return Boolean(adminSessionFromRequest(req))}
function adminOtpHash(challengeId,otp){
  return crypto.createHmac(error:safeErrorMessage(e,'sha256'),OTP_PEPPER).update(`${challengeId}:${String(otp||error:safeErrorMessage(e,''))}`).digest(error:safeErrorMessage(e,'hex'));
}
function safeEqualText(a,b){
  const aa=Buffer.from(String(a||error:safeErrorMessage(e,'')));const bb=Buffer.from(String(b||error:safeErrorMessage(e,'')));
  return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);
}
function maskEmail(email){
  const [name,domain]=String(email||error:safeErrorMessage(e,'')).split(error:safeErrorMessage(e,'@'));
  if(!name||!domain)return error:safeErrorMessage(e,'');
  return `${name.slice(0,1)}${error:safeErrorMessage(e,'*').repeat(Math.max(3,name.length-2))}${name.length>1?name.slice(-1):error:safeErrorMessage(e,'')}@${domain}`;
}
function maskPhone(phone){
  const digits=String(phone||error:safeErrorMessage(e,'')).replace(/error:safeErrorMessage(e,'undefined')D/g,error:safeErrorMessage(e,''));
  if(digits.length<4)return error:safeErrorMessage(e,'');
  return `${digits.slice(0,3)} *** *** ${digits.slice(-4)}`;
}
function toSaudiE164(value){
  const local=normalizePhone(value);
  if(/^05error:safeErrorMessage(e,'undefined')d{8}$/.test(local))return `+966${local.slice(1)}`;
  const digits=String(value||error:safeErrorMessage(e,'')).replace(/error:safeErrorMessage(e,'undefined')D/g,error:safeErrorMessage(e,''));
  return /^9665error:safeErrorMessage(e,'undefined')d{8}$/.test(digits)?`+${digits}`:error:safeErrorMessage(e,'');
}
function otpProviderStatus(){
  return {
    email:Boolean(env(error:safeErrorMessage(e,'RESEND_API_KEY'))&&env(error:safeErrorMessage(e,'KABSH_OTP_FROM_EMAIL'))),
    sms:Boolean(env(error:safeErrorMessage(e,'TWILIO_ACCOUNT_SID'))&&env(error:safeErrorMessage(e,'TWILIO_AUTH_TOKEN'))&&env(error:safeErrorMessage(e,'TWILIO_FROM_NUMBER')))
  };
}
async function sendOtpEmail(user,otp){
  const apiKey=env(error:safeErrorMessage(e,'RESEND_API_KEY'));
  const from=env(error:safeErrorMessage(e,'KABSH_OTP_FROM_EMAIL'));
  if(!apiKey||!from)throw new Error(error:safeErrorMessage(e,'Email OTP provider is not configured'));
  if(!validEmail(user.email))throw new Error(error:safeErrorMessage(e,'Admin email is not valid'));
  const response=await fetch(error:safeErrorMessage(e,'https://api.resend.com/emails'),{
    method:error:safeErrorMessage(e,'POST'),
    headers:{error:safeErrorMessage(e,'Authorization'):`Bearer ${apiKey}`,error:safeErrorMessage(e,'Content-Type'):error:safeErrorMessage(e,'application/json')},
    body:JSON.stringify({
      from,
      to:[user.email],
      subject:error:safeErrorMessage(e,'Ass Al Halaal admin verification code'),
      text:`Your Ass Al Halaal admin verification code is ${otp}. It expires in ${ADMIN_OTP_MINUTES} minutes.`,
      html:`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px"><h2>Admin verification</h2><p>Use this code to finish signing in to Ass Al Halaal:</p><div style="font-size:34px;font-weight:700;letter-spacing:8px;margin:24px 0">${otp}</div><p>This code expires in ${ADMIN_OTP_MINUTES} minutes. If you did not request it, do not share this code.</p></div>`
    })
  });
  if(!response.ok){
    const info=await response.text().catch(()=>error:safeErrorMessage(e,''));
    throw new Error(`Email OTP delivery failed (${response.status})${info?`: ${info.slice(0,160)}`:error:safeErrorMessage(e,'')}`);
  }
}
async function sendOtpSms(user,otp){
  const sid=env(error:safeErrorMessage(e,'TWILIO_ACCOUNT_SID'));
  const token=env(error:safeErrorMessage(e,'TWILIO_AUTH_TOKEN'));
  const from=env(error:safeErrorMessage(e,'TWILIO_FROM_NUMBER'));
  const to=toSaudiE164(user.phone);
  if(!sid||!token||!from)throw new Error(error:safeErrorMessage(e,'SMS OTP provider is not configured'));
  if(!to)throw new Error(error:safeErrorMessage(e,'Admin mobile number is not valid'));
  const form=new URLSearchParams({To:to,From:from,Body:`Ass Al Halaal admin code: ${otp}. Expires in ${ADMIN_OTP_MINUTES} minutes.`});
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{
    method:error:safeErrorMessage(e,'POST'),
    headers:{error:safeErrorMessage(e,'Authorization'):`Basic ${Buffer.from(`${sid}:${token}`).toString(error:safeErrorMessage(e,'base64'))}`,error:safeErrorMessage(e,'Content-Type'):error:safeErrorMessage(e,'application/x-www-form-urlencoded')},
    body:form
  });
  if(!response.ok){
    const info=await response.text().catch(()=>error:safeErrorMessage(e,''));
    throw new Error(`SMS OTP delivery failed (${response.status})${info?`: ${info.slice(0,160)}`:error:safeErrorMessage(e,'')}`);
  }
}
async function deliverAdminOtp(user,otp,requested=error:safeErrorMessage(e,'auto')){
  const available=otpProviderStatus();
  const requestedMode=String(requested||error:safeErrorMessage(e,'auto')).toLowerCase();
  const modes=[];
  if(requestedMode===error:safeErrorMessage(e,'email')&&available.email)modes.push(error:safeErrorMessage(e,'email'));
  else if(requestedMode===error:safeErrorMessage(e,'sms')&&available.sms)modes.push(error:safeErrorMessage(e,'sms'));
  else if(requestedMode===error:safeErrorMessage(e,'both')){
    if(available.email)modes.push(error:safeErrorMessage(e,'email'));
    if(available.sms)modes.push(error:safeErrorMessage(e,'sms'));
  }else{
    if(available.email)modes.push(error:safeErrorMessage(e,'email'));
    if(available.sms)modes.push(error:safeErrorMessage(e,'sms'));
  }
  if(!modes.length)throw new Error(error:safeErrorMessage(e,'No real OTP delivery provider is configured'));
  const results=await Promise.allSettled(modes.map(mode=>mode===error:safeErrorMessage(e,'email')?sendOtpEmail(user,otp):sendOtpSms(user,otp)));
  const delivered=modes.filter((_,i)=>results[i].status===error:safeErrorMessage(e,'fulfilled'));
  if(!delivered.length){
    const reason=results.find(x=>x.status===error:safeErrorMessage(e,'rejected'))?.reason?.message||error:safeErrorMessage(e,'OTP delivery failed');
    throw new Error(reason);
  }
  const masked=[];
  if(delivered.includes(error:safeErrorMessage(e,'email')))masked.push(maskEmail(user.email));
  if(delivered.includes(error:safeErrorMessage(e,'sms')))masked.push(maskPhone(user.phone));
  return {channels:delivered,channel:delivered.join(error:safeErrorMessage(e,'+')),masked};
}
function adminAuthAudit(eventType,userId,details={}){
  try{
    governanceEvent(eventType,error:safeErrorMessage(e,'admin_auth'),String(userId||error:safeErrorMessage(e,'unknown')),{
      actor:String(userId||error:safeErrorMessage(e,'Unknown administrator')),
      details
    });
  }catch{}
}
function adminRequestIp(req){
  const forwarded=TRUST_PROXY?String(req.headers[error:safeErrorMessage(e,'x-forwarded-for')]||error:safeErrorMessage(e,'')).split(error:safeErrorMessage(e,','))[0].trim():error:safeErrorMessage(e,'');
  return String(forwarded||req.socket?.remoteAddress||error:safeErrorMessage(e,'unknown')).slice(0,80);
}
async function rawBody(req,max=1_000_000){
  let raw=error:safeErrorMessage(e,'');
  for await(const chunk of req){raw+=chunk;if(raw.length>max) throw new Error(error:safeErrorMessage(e,'Payload too large'))}
  return raw;
}
async function body(req){
  const raw=await rawBody(req);
  if(!raw) return {};
  try{return JSON.parse(raw)}catch{throw new Error(error:safeErrorMessage(e,'Invalid JSON'))}
}
function operationForOrder(orderId){
  const operation=db.prepare(`SELECT oo.*,s.name_ar slaughterhouse_name_ar,s.name_en slaughterhouse_name_en,s.city slaughterhouse_city,
      s.license slaughterhouse_license,s.veterinary_supervisor,s.capacity_per_day
    FROM order_operations oo LEFT JOIN slaughterhouses s ON s.id=oo.slaughterhouse_id WHERE oo.order_id=?`).get(orderId);
  if(!operation) return null;
  const events=db.prepare(`SELECT id,event_type,from_value,to_value,actor,details_json,created_at
    FROM order_operation_events WHERE order_id=? ORDER BY id`).all(orderId).map(e=>{
      let details={};try{details=JSON.parse(e.details_json||error:safeErrorMessage(e,'{}'))}catch{}
      return {...e,details};
    });
  return {...operation,events};
}
function mediaForOrder(orderId){
  return db.prepare(`SELECT id,order_id,media_type,url,caption_ar,caption_en,created_by,created_at
    FROM order_media WHERE order_id=? ORDER BY id DESC`).all(orderId);
}
function validOrderMediaUrl(value){
  const raw=String(value||error:safeErrorMessage(e,'')).trim();
  if(!raw||raw.length>1800)return error:safeErrorMessage(e,'');
  if(/^https?:error:safeErrorMessage(e,'undefined')/error:safeErrorMessage(e,'undefined')//i.test(raw))return raw;
  if(/^error:safeErrorMessage(e,'undefined')/?assetserror:safeErrorMessage(e,'undefined')//i.test(raw))return raw.startsWith(error:safeErrorMessage(e,'/'))?raw:`/${raw}`;
  return error:safeErrorMessage(e,'');
}
function listSlaughterhouses(){
  return db.prepare(`SELECT s.*,
      SUM(CASE WHEN o.status NOT IN (error:safeErrorMessage(e,'completed'),error:safeErrorMessage(e,'cancelled')) THEN 1 ELSE 0 END) active_orders,
      SUM(CASE WHEN oo.preparation_status=error:safeErrorMessage(e,'in_progress') THEN 1 ELSE 0 END) preparing_orders,
      SUM(CASE WHEN oo.preparation_status=error:safeErrorMessage(e,'ready') AND o.status NOT IN (error:safeErrorMessage(e,'completed'),error:safeErrorMessage(e,'cancelled')) THEN 1 ELSE 0 END) ready_orders
    FROM slaughterhouses s
    LEFT JOIN order_operations oo ON oo.slaughterhouse_id=s.id
    LEFT JOIN orders o ON o.id=oo.order_id
    GROUP BY s.id ORDER BY s.active DESC,s.name_en`).all().map(r=>({...r,active:Boolean(r.active)}));
}
function operationsSummary(){
  const row=db.prepare(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN veterinary_status=error:safeErrorMessage(e,'pending') THEN 1 ELSE 0 END) vet_pending,
      SUM(CASE WHEN veterinary_status=error:safeErrorMessage(e,'passed') THEN 1 ELSE 0 END) vet_passed,
      SUM(CASE WHEN slaughter_status=error:safeErrorMessage(e,'in_progress') THEN 1 ELSE 0 END) slaughtering,
      SUM(CASE WHEN preparation_status=error:safeErrorMessage(e,'in_progress') THEN 1 ELSE 0 END) preparing,
      SUM(CASE WHEN preparation_status=error:safeErrorMessage(e,'ready') THEN 1 ELSE 0 END) ready
    FROM order_operations`).get();
  return {...row,slaughterhouses:listSlaughterhouses()};
}
function operationEvent(orderId,eventType,fromValue,toValue,{actor=error:safeErrorMessage(e,'System Administrator'),details={}}={}){
  db.prepare(`INSERT INTO order_operation_events(order_id,event_type,from_value,to_value,actor,details_json,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(orderId,eventType,fromValue??null,toValue??null,String(actor||error:safeErrorMessage(e,'System Administrator')),JSON.stringify(details||{}),nowIso());
}
function ensureOrderOperation(orderId,assignedAt=nowIso()){
  const existing=db.prepare(error:safeErrorMessage(e,'SELECT order_id FROM order_operations WHERE order_id=?')).get(orderId);
  if(existing) return;
  const defaultHouse=db.prepare(error:safeErrorMessage(e,'SELECT id FROM slaughterhouses WHERE active=1 ORDER BY rowid LIMIT 1')).get();
  db.prepare(`INSERT INTO order_operations(order_id,slaughterhouse_id,veterinary_status,slaughter_status,preparation_status,assigned_at,assigned_by,notes,updated_at)
    VALUES(?,?,error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'pending'),?,error:safeErrorMessage(e,'System Administrator'),error:safeErrorMessage(e,''),?)`).run(orderId,defaultHouse?.id||null,assignedAt,nowIso());
  operationEvent(orderId,error:safeErrorMessage(e,'operation.created'),null,defaultHouse?.id||null,{details:{automatic:true}});
}

function deliveryEvent(orderId,eventType,fromValue,toValue,{actor=error:safeErrorMessage(e,'System Administrator'),details={}}={}){
  db.prepare(`INSERT INTO delivery_events(order_id,event_type,from_value,to_value,actor,details_json,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(orderId,eventType,fromValue??null,toValue??null,String(actor||error:safeErrorMessage(e,'System Administrator')),JSON.stringify(details||{}),nowIso());
}
function ensureOrderDelivery(orderId,createdAt=nowIso()){
  const existing=db.prepare(error:safeErrorMessage(e,'SELECT order_id FROM order_deliveries WHERE order_id=?')).get(orderId);
  if(existing) return;
  db.prepare(`INSERT INTO order_deliveries(order_id,courier_id,delivery_status,assigned_at,out_for_delivery_at,delivered_at,failed_at,
      receiver_name,pod_note,failed_reason,assigned_by,updated_at)
    VALUES(?,NULL,error:safeErrorMessage(e,'unassigned'),NULL,NULL,NULL,NULL,error:safeErrorMessage(e,''),error:safeErrorMessage(e,''),error:safeErrorMessage(e,''),error:safeErrorMessage(e,'System Administrator'),?)`).run(orderId,createdAt||nowIso());
  deliveryEvent(orderId,error:safeErrorMessage(e,'delivery.created'),null,error:safeErrorMessage(e,'unassigned'),{details:{automatic:true}});
}
function deliveryForOrder(orderId){
  const delivery=db.prepare(`SELECT od.*,c.name_ar courier_name_ar,c.name_en courier_name_en,c.phone courier_phone,
      c.vehicle courier_vehicle,c.plate courier_plate,c.zone courier_zone,c.active courier_active
    FROM order_deliveries od LEFT JOIN couriers c ON c.id=od.courier_id WHERE od.order_id=?`).get(orderId);
  if(!delivery) return null;
  const events=db.prepare(`SELECT id,event_type,from_value,to_value,actor,details_json,created_at
    FROM delivery_events WHERE order_id=? ORDER BY id`).all(orderId).map(e=>{
      let details={};try{details=JSON.parse(e.details_json||error:safeErrorMessage(e,'{}'))}catch{}
      return {...e,details};
    });
  return {...delivery,courier_active:delivery.courier_active===null?null:Boolean(delivery.courier_active),events};
}
function listCouriers(){
  return db.prepare(`SELECT c.*,
      SUM(CASE WHEN od.delivery_status IN (error:safeErrorMessage(e,'assigned'),error:safeErrorMessage(e,'out_for_delivery')) THEN 1 ELSE 0 END) active_deliveries,
      SUM(CASE WHEN od.delivery_status=error:safeErrorMessage(e,'out_for_delivery') THEN 1 ELSE 0 END) out_for_delivery,
      SUM(CASE WHEN od.delivery_status=error:safeErrorMessage(e,'delivered') THEN 1 ELSE 0 END) delivered_orders,
      SUM(CASE WHEN od.delivery_status=error:safeErrorMessage(e,'failed') THEN 1 ELSE 0 END) failed_orders
    FROM couriers c
    LEFT JOIN order_deliveries od ON od.courier_id=c.id
    GROUP BY c.id ORDER BY c.active DESC,c.name_en`).all().map(r=>({...r,active:Boolean(r.active)}));
}
function deliverySummary(){
  const row=db.prepare(`SELECT COUNT(*) total,
      SUM(CASE WHEN delivery_status=error:safeErrorMessage(e,'unassigned') THEN 1 ELSE 0 END) unassigned,
      SUM(CASE WHEN delivery_status=error:safeErrorMessage(e,'assigned') THEN 1 ELSE 0 END) assigned,
      SUM(CASE WHEN delivery_status=error:safeErrorMessage(e,'out_for_delivery') THEN 1 ELSE 0 END) out_for_delivery,
      SUM(CASE WHEN delivery_status=error:safeErrorMessage(e,'delivered') THEN 1 ELSE 0 END) delivered,
      SUM(CASE WHEN delivery_status=error:safeErrorMessage(e,'failed') THEN 1 ELSE 0 END) failed
    FROM order_deliveries`).get();
  return {...row,couriers:listCouriers()};
}
function recordCodOnDelivery(order,actor=error:safeErrorMessage(e,'System Administrator')){
  if(String(order.payment_method||error:safeErrorMessage(e,'')).toLowerCase()!==error:safeErrorMessage(e,'cod')) return null;
  const agg=db.prepare(error:safeErrorMessage(e,'SELECT COALESCE(SUM(amount),0) paid FROM finance_payments WHERE order_id=?')).get(order.id);
  const paid=Math.max(0,Number(agg?.paid||0));
  const total=Math.max(0,Number(order.total||0));
  const outstanding=Math.max(0,total-paid);
  if(outstanding<=0) return null;
  const id=`PAY-COD-${order.id}-${Date.now()}`;
  const reference=`COD-${order.id}`;
  const created=nowIso();
  db.prepare(`INSERT INTO finance_payments(id,order_id,amount,method,reference,note,actor,created_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(id,order.id,outstanding,error:safeErrorMessage(e,'cod'),reference,error:safeErrorMessage(e,'Automatically collected on delivery'),actor,created);
  db.prepare(`INSERT INTO finance_events(event_type,entity_type,entity_id,order_id,actor,details_json,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(error:safeErrorMessage(e,'payment.recorded'),error:safeErrorMessage(e,'payment'),id,order.id,actor,JSON.stringify({amount:outstanding,method:error:safeErrorMessage(e,'cod'),reference,source:error:safeErrorMessage(e,'delivery')}),created);
  return {id,amount:outstanding,reference};
}


function reconcileOrderStatusFromWorkflow(row){
  if(!row) return row;
  if([error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'completed'),error:safeErrorMessage(e,'cancelled')].includes(row.status)) return row;

  ensureOrderOperation(row.id,row.created_at||nowIso());
  const op=db.prepare(error:safeErrorMessage(e,'SELECT veterinary_status,slaughter_status,preparation_status FROM order_operations WHERE order_id=?')).get(row.id);
  if(!op) return row;

  let desired=row.status;

  if(op.preparation_status===error:safeErrorMessage(e,'ready') && [error:safeErrorMessage(e,'received'),error:safeErrorMessage(e,'confirmed'),error:safeErrorMessage(e,'preparing')].includes(desired)){
    desired=error:safeErrorMessage(e,'ready');
  }else if(
    (op.slaughter_status===error:safeErrorMessage(e,'in_progress') || op.slaughter_status===error:safeErrorMessage(e,'completed') || op.preparation_status===error:safeErrorMessage(e,'in_progress')) &&
    [error:safeErrorMessage(e,'received'),error:safeErrorMessage(e,'confirmed')].includes(desired)
  ){
    desired=error:safeErrorMessage(e,'preparing');
  }

  if(desired===row.status) return row;

  const now=nowIso();
  db.prepare(error:safeErrorMessage(e,'UPDATE orders SET status=?,updated_at=? WHERE id=?')).run(desired,now,row.id);
  db.prepare(error:safeErrorMessage(e,'INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)'))
    .run(row.id,error:safeErrorMessage(e,'workflow.reconciled'),row.status,desired,now);

  return {...row,status:desired,updated_at:now};
}

function orderWithItems(row){
  if(!row) return null;
  row=reconcileOrderStatusFromWorkflow(row);
  const items=db.prepare(error:safeErrorMessage(e,'SELECT product_id,name_ar,name_en,qty,unit_price,cut,pack,fat FROM order_items WHERE order_id=? ORDER BY id')).all(row.id);
  const events=db.prepare(error:safeErrorMessage(e,'SELECT event_type,from_status,to_status,created_at FROM order_events WHERE order_id=? ORDER BY id')).all(row.id);
  const operation=operationForOrder(row.id);
  ensureOrderDelivery(row.id,row.created_at||nowIso());
  const delivery=deliveryForOrder(row.id);
  const media=mediaForOrder(row.id);
  const customer=row.customer_id?db.prepare(error:safeErrorMessage(e,'SELECT id,name,email,phone,provider FROM customer_accounts WHERE id=?')).get(row.customer_id):null;
  return {...row,items,events,operation,delivery,media,customer:customer||null};
}
function listOrders(where=error:safeErrorMessage(e,''),params=[]){
  const rows=db.prepare(`SELECT * FROM orders ${where} ORDER BY datetime(created_at) DESC`).all(...params);
  return rows.map(orderWithItems);
}
function redactOrderFinance(order,user){
  if(!order) return order;
  if(adminPermission(user,error:safeErrorMessage(e,'finance')).view) return order;
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
function makeOrderId(){return error:safeErrorMessage(e,'KN-')+new Date().toISOString().slice(2,10).replace(/-/g,error:safeErrorMessage(e,''))+error:safeErrorMessage(e,'-')+crypto.randomInt(1000,9999)}
function makeOrderCode(){
  const day=new Date().toISOString().slice(0,10).replace(/-/g,error:safeErrorMessage(e,''));
  for(let i=0;i<30;i++){
    const code=`KBJ-${day}-${crypto.randomBytes(3).toString(error:safeErrorMessage(e,'hex')).toUpperCase()}`;
    if(!db.prepare(error:safeErrorMessage(e,'SELECT id FROM orders WHERE order_code=?')).get(code))return code;
  }
  return `KBJ-${day}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
}

function financeMethodKey(value=error:safeErrorMessage(e,'cod')){
  const m=String(value||error:safeErrorMessage(e,'cod')).toLowerCase();
  if(m.includes(error:safeErrorMessage(e,'card'))) return error:safeErrorMessage(e,'card');
  if(m.includes(error:safeErrorMessage(e,'bank'))) return error:safeErrorMessage(e,'bank');
  if(m.includes(error:safeErrorMessage(e,'wallet'))) return error:safeErrorMessage(e,'wallet');
  if(m.includes(error:safeErrorMessage(e,'cash'))) return error:safeErrorMessage(e,'cod');
  return [error:safeErrorMessage(e,'cod'),error:safeErrorMessage(e,'card'),error:safeErrorMessage(e,'bank'),error:safeErrorMessage(e,'wallet')].includes(m)?m:error:safeErrorMessage(e,'cod');
}
function financeOrderLedger(){
  const orders=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders ORDER BY datetime(created_at) DESC')).all();
  const paymentRows=db.prepare(`SELECT order_id,COALESCE(SUM(amount),0) paid_amount,MAX(datetime(created_at)) last_payment_at
    FROM finance_payments GROUP BY order_id`).all();
  const paymentMap=new Map(paymentRows.map(x=>[x.order_id,x]));
  const lastPaymentStmt=db.prepare(error:safeErrorMessage(e,'SELECT method,reference,note,created_at FROM finance_payments WHERE order_id=? ORDER BY datetime(created_at) DESC,id DESC LIMIT 1'));

  return orders.map(o=>{
    const agg=paymentMap.get(o.id)||{paid_amount:0,last_payment_at:null};
    const last=lastPaymentStmt.get(o.id)||null;
    const total=Number(o.total||0);
    const paid=Math.max(0,Math.min(total,Number(agg.paid_amount||0)));
    const outstanding=Math.max(0,total-paid);
    const status=o.status===error:safeErrorMessage(e,'cancelled')?error:safeErrorMessage(e,'cancelled'):paid<=0?error:safeErrorMessage(e,'due'):outstanding<=0?error:safeErrorMessage(e,'collected'):error:safeErrorMessage(e,'partial');
    return {
      id:`INV-${o.id}`,
      order_id:o.id,
      customer:o.customer_name,
      phone:o.phone,
      total,
      paid,
      outstanding,
      method:last?.method||o.payment_method||error:safeErrorMessage(e,'cod'),
      status,
      order_status:o.status,
      reference:last?.reference||error:safeErrorMessage(e,''),
      note:last?.note||error:safeErrorMessage(e,''),
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
  const cod=ledger.filter(r=>financeMethodKey(r.method)===error:safeErrorMessage(e,'cod')).reduce((s,r)=>s+Number(r.paid||0),0);
  const settlements=db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status=error:safeErrorMessage(e,'pending') THEN amount ELSE 0 END),0) pending_amount,
      COALESCE(SUM(CASE WHEN status=error:safeErrorMessage(e,'completed') THEN amount ELSE 0 END),0) completed_amount,
      SUM(CASE WHEN status=error:safeErrorMessage(e,'pending') THEN 1 ELSE 0 END) pending_count,
      SUM(CASE WHEN status=error:safeErrorMessage(e,'completed') THEN 1 ELSE 0 END) completed_count
    FROM finance_settlements`).get();
  return {
    gross,
    collected,
    outstanding,
    cod,
    collection_rate:gross?Math.round((collected/gross)*100):0,
    open_invoices:ledger.filter(r=>r.outstanding>0&&r.status!==error:safeErrorMessage(e,'cancelled')).length,
    pending_settlement_amount:Number(settlements.pending_amount||0),
    completed_settlement_amount:Number(settlements.completed_amount||0),
    pending_settlement_count:Number(settlements.pending_count||0),
    completed_settlement_count:Number(settlements.completed_count||0)
  };
}
function financeSettlementsList(){
  return db.prepare(error:safeErrorMessage(e,'SELECT * FROM finance_settlements ORDER BY datetime(created_at) DESC,id DESC')).all();
}
function financeEvent(eventType,entityType,entityId,{orderId=null,actor=error:safeErrorMessage(e,'System Administrator'),details={}}={}){
  db.prepare(`INSERT INTO finance_events(event_type,entity_type,entity_id,order_id,actor,details_json,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(eventType,entityType,entityId,orderId,actor,JSON.stringify(details||{}),nowIso());
}



const GOVERNANCE_ROLES=[error:safeErrorMessage(e,'owner'),error:safeErrorMessage(e,'ops'),error:safeErrorMessage(e,'finance'),error:safeErrorMessage(e,'slaughterhouse'),error:safeErrorMessage(e,'compliance'),error:safeErrorMessage(e,'marketing')];
const GOVERNANCE_SCOPES=[error:safeErrorMessage(e,'all'),error:safeErrorMessage(e,'north'),error:safeErrorMessage(e,'central'),error:safeErrorMessage(e,'east')];
const GOVERNANCE_OTP_MODES=[error:safeErrorMessage(e,'email'),error:safeErrorMessage(e,'sms'),error:safeErrorMessage(e,'both'),error:safeErrorMessage(e,'pending')];
const GOVERNANCE_MODULES=[error:safeErrorMessage(e,'dashboard'),error:safeErrorMessage(e,'suppliers'),error:safeErrorMessage(e,'orders'),error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'finance'),error:safeErrorMessage(e,'ai'),error:safeErrorMessage(e,'whatsapp'),error:safeErrorMessage(e,'marketing'),error:safeErrorMessage(e,'users'),error:safeErrorMessage(e,'audit')];

function normalizeAdminOtpMode(value,legacy=error:safeErrorMessage(e,'pending')){
  const mode=String(value||error:safeErrorMessage(e,'')).toLowerCase();
  if(GOVERNANCE_OTP_MODES.includes(mode))return mode;
  if(String(legacy||error:safeErrorMessage(e,''))===error:safeErrorMessage(e,'fido2'))return error:safeErrorMessage(e,'both');
  if(String(legacy||error:safeErrorMessage(e,''))===error:safeErrorMessage(e,'totp'))return error:safeErrorMessage(e,'email');
  return error:safeErrorMessage(e,'pending');
}
function legacyMfaForOtpMode(mode){
  const normalized=normalizeAdminOtpMode(mode);
  if(normalized===error:safeErrorMessage(e,'both'))return error:safeErrorMessage(e,'fido2');
  if(normalized===error:safeErrorMessage(e,'email')||normalized===error:safeErrorMessage(e,'sms'))return error:safeErrorMessage(e,'totp');
  return error:safeErrorMessage(e,'pending');
}

function governanceEvent(eventType,entityType,entityId,{actor=error:safeErrorMessage(e,'System Administrator'),fromValue=null,toValue=null,details={}}={}){
  db.prepare(`INSERT INTO governance_events(event_type,entity_type,entity_id,actor,from_value,to_value,details_json,created_at)
    VALUES(?,?,?,?,?,?,?,?)`).run(
      String(eventType),String(entityType),String(entityId),String(actor||error:safeErrorMessage(e,'System Administrator')),
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
  return db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users ORDER BY CASE status WHEN ? THEN 0 ELSE 1 END,id'))
    .all(error:safeErrorMessage(e,'active')).map(governanceUserRow);
}
function governanceApprovals(){
  return db.prepare(`SELECT * FROM governance_approvals
    ORDER BY CASE status WHEN error:safeErrorMessage(e,'pending') THEN 0 ELSE 1 END,
             CASE risk WHEN error:safeErrorMessage(e,'high') THEN 0 WHEN error:safeErrorMessage(e,'medium') THEN 1 ELSE 2 END,
             datetime(requested_at) DESC,id`).all().map(governanceApprovalRow);
}
function governancePermissions(){
  const rows=db.prepare(error:safeErrorMessage(e,'SELECT role,module,can_view,can_manage FROM role_permissions ORDER BY role,module')).all();
  const matrix={};
  for(const role of GOVERNANCE_ROLES) matrix[role]={};
  for(const r of rows) matrix[r.role][r.module]={view:Boolean(r.can_view),manage:Boolean(r.can_manage)};
  return matrix;
}
function governanceSummary(){
  const u=db.prepare(`SELECT COUNT(*) total,
      SUM(CASE WHEN status=error:safeErrorMessage(e,'active') THEN 1 ELSE 0 END) active,
      SUM(CASE WHEN COALESCE(NULLIF(otp_mode,error:safeErrorMessage(e,'')),error:safeErrorMessage(e,'pending'))<>error:safeErrorMessage(e,'pending') THEN 1 ELSE 0 END) mfa_active,
      COUNT(DISTINCT role) roles
    FROM admin_users`).get();
  const a=db.prepare(`SELECT
      SUM(CASE WHEN status=error:safeErrorMessage(e,'pending') THEN 1 ELSE 0 END) pending,
      SUM(CASE WHEN status=error:safeErrorMessage(e,'approved') THEN 1 ELSE 0 END) approved,
      SUM(CASE WHEN status=error:safeErrorMessage(e,'rejected') THEN 1 ELSE 0 END) rejected
    FROM governance_approvals`).get();
  const audit=Number(db.prepare(`SELECT COUNT(*) n FROM audit_events WHERE category=error:safeErrorMessage(e,'security')`).get()?.n||0);
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
  const max=rows.reduce((m,r)=>Math.max(m,Number(String(r.id).split(error:safeErrorMessage(e,'-')).pop())||0),0);
  return `${prefix}${String(max+1).padStart(3,error:safeErrorMessage(e,'0'))}`;
}
function activeOwnerCount(){
  return Number(db.prepare(`SELECT COUNT(*) n FROM admin_users WHERE role=error:safeErrorMessage(e,'owner') AND status=error:safeErrorMessage(e,'active')`).get()?.n||0);
}

function adminUserFromRequest(req){
  const session=adminSessionFromRequest(req);
  if(!session)return null;
  return db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(session.admin_id)||null;
}
function adminActorName(user){
  return user?.name_en||user?.name_ar||user?.id||error:safeErrorMessage(e,'System Administrator');
}
function adminPermission(user,module){
  if(!user||!module) return {view:false,manage:false};
  const row=db.prepare(error:safeErrorMessage(e,'SELECT can_view,can_manage FROM role_permissions WHERE role=? AND module=?')).get(user.role,module);
  return {view:Boolean(row?.can_view),manage:Boolean(row?.can_manage)};
}
function rbacRequirement(pathname,method){
  const manage=method!==error:safeErrorMessage(e,'GET')&&method!==error:safeErrorMessage(e,'HEAD');
  if(pathname===error:safeErrorMessage(e,'/api/admin/session')||pathname.startsWith(error:safeErrorMessage(e,'/api/admin/security'))) return null;
  if(pathname.startsWith(error:safeErrorMessage(e,'/api/admin/audit'))) return {module:error:safeErrorMessage(e,'audit'),access:error:safeErrorMessage(e,'view')};
  if(pathname.startsWith(error:safeErrorMessage(e,'/api/admin/governance'))) return {module:error:safeErrorMessage(e,'users'),access:manage?error:safeErrorMessage(e,'manage'):error:safeErrorMessage(e,'view')};
  if(pathname.startsWith(error:safeErrorMessage(e,'/api/admin/finance'))) return {module:error:safeErrorMessage(e,'finance'),access:manage?error:safeErrorMessage(e,'manage'):error:safeErrorMessage(e,'view')};
  if(pathname.startsWith(error:safeErrorMessage(e,'/api/admin/ai'))) return {module:error:safeErrorMessage(e,'ai'),access:manage?error:safeErrorMessage(e,'manage'):error:safeErrorMessage(e,'view')};
  if(pathname.startsWith(error:safeErrorMessage(e,'/api/admin/whatsapp'))) return {module:error:safeErrorMessage(e,'whatsapp'),access:manage?error:safeErrorMessage(e,'manage'):error:safeErrorMessage(e,'view')};
  if(pathname.startsWith(error:safeErrorMessage(e,'/api/admin/marketing'))) return {module:error:safeErrorMessage(e,'marketing'),access:manage?error:safeErrorMessage(e,'manage'):error:safeErrorMessage(e,'view')};
  if(pathname.startsWith(error:safeErrorMessage(e,'/api/admin/suppliers'))) return {module:error:safeErrorMessage(e,'suppliers'),access:manage?error:safeErrorMessage(e,'manage'):error:safeErrorMessage(e,'view')};
  if(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/orderserror:safeErrorMessage(e,'undefined')/[^/]+error:safeErrorMessage(e,'undefined')/delivery$/.test(pathname)||pathname.startsWith(error:safeErrorMessage(e,'/api/admin/couriers'))){
    return {module:error:safeErrorMessage(e,'delivery'),access:manage?error:safeErrorMessage(e,'manage'):error:safeErrorMessage(e,'view')};
  }
  if(pathname===error:safeErrorMessage(e,'/api/admin/stats')) return {module:error:safeErrorMessage(e,'dashboard'),access:error:safeErrorMessage(e,'view')};
  if(pathname.startsWith(error:safeErrorMessage(e,'/api/admin/orders'))||pathname.startsWith(error:safeErrorMessage(e,'/api/admin/slaughterhouses'))){
    return {module:error:safeErrorMessage(e,'orders'),access:manage?error:safeErrorMessage(e,'manage'):error:safeErrorMessage(e,'view')};
  }
  return {module:error:safeErrorMessage(e,'dashboard'),access:manage?error:safeErrorMessage(e,'manage'):error:safeErrorMessage(e,'view')};
}
function recordRbacDenied(req,user,pathname,requirement,reason){
  try{
    governanceEvent(error:safeErrorMessage(e,'rbac.access.denied'),error:safeErrorMessage(e,'route'),pathname,{
      actor:adminActorName(user),
      fromValue:user?.role||error:safeErrorMessage(e,'unknown'),
      toValue:error:safeErrorMessage(e,'denied'),
      details:{
        method:req.method,
        module:requirement?.module||null,
        access:requirement?.access||null,
        role:user?.role||null,
        scope:user?.scope||null,
        user_id:user?.id||error:safeErrorMessage(e,'unknown'),
        reason
      }
    });
  }catch{}
}
function enforceAdminRbac(req,res,pathname){
  const user=adminUserFromRequest(req);
  const requirement=rbacRequirement(pathname,req.method);
  if(!user){
    recordRbacDenied(req,null,pathname,requirement,error:safeErrorMessage(e,'unknown_admin_user'));
    json(res,403,{error:error:safeErrorMessage(e,'Administrative user not found'),code:error:safeErrorMessage(e,'RBAC_USER_NOT_FOUND')});
    return null;
  }
  if(user.status!==error:safeErrorMessage(e,'active')){
    recordRbacDenied(req,user,pathname,requirement,error:safeErrorMessage(e,'account_suspended'));
    json(res,403,{error:error:safeErrorMessage(e,'Administrative account is suspended'),code:error:safeErrorMessage(e,'RBAC_ACCOUNT_SUSPENDED'),user_id:user.id});
    return null;
  }
  if(!requirement) return {user,permission:{view:true,manage:true},requirement:null};
  const permission=adminPermission(user,requirement.module);
  const allowed=requirement.access===error:safeErrorMessage(e,'manage')?permission.manage:permission.view;
  if(!allowed){
    recordRbacDenied(req,user,pathname,requirement,error:safeErrorMessage(e,'permission_denied'));
    json(res,403,{
      error:error:safeErrorMessage(e,'Access denied by RBAC policy'),
      code:error:safeErrorMessage(e,'RBAC_FORBIDDEN'),
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
  const token=parseCookies(req).kn_admin_session||error:safeErrorMessage(e,'');
  return token?adminTokenHash(token):error:safeErrorMessage(e,'');
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
        ip:row.ip_address||error:safeErrorMessage(e,''),
        userAgent:row.user_agent||error:safeErrorMessage(e,'')
      }));
}
function adminSecuritySnapshot(req,user){
  const otpMode=normalizeAdminOtpMode(user?.otp_mode,user?.mfa);
  return {
    account:{
      id:user?.id||error:safeErrorMessage(e,''),
      nameAr:user?.name_ar||error:safeErrorMessage(e,''),
      nameEn:user?.name_en||error:safeErrorMessage(e,''),
      email:user?.email||error:safeErrorMessage(e,''),
      phone:user?.phone||error:safeErrorMessage(e,''),
      otpMode,
      emailVerified:Boolean(user?.email_verified),
      phoneVerified:Boolean(user?.phone_verified),
      last2faAt:user?.last_2fa_at||null,
      lastLogin:user?.last_login||null,
      passwordUpdatedAt:user?.password_updated_at||null
    },
    providers:otpProviderStatus(),
    sessions:adminSecuritySessions(req,user?.id||error:safeErrorMessage(e,''))
  };
}
function adminSecurityChallengeRow(adminId,challengeId){
  return db.prepare(`SELECT * FROM admin_security_challenges WHERE id=? AND admin_id=?`).get(challengeId,adminId)||null;
}
function adminSecurityChallengeExpired(row){
  const expires=Date.parse(String(row?.expires_at||error:safeErrorMessage(e,'')));
  return !Number.isFinite(expires)||expires<=Date.now();
}
async function deliverSecurityContactOtp(purpose,value,otp){
  if(purpose===error:safeErrorMessage(e,'email_change')){
    await sendOtpEmail({email:value},otp);
    return {channel:error:safeErrorMessage(e,'email'),masked:maskEmail(value)};
  }
  if(purpose===error:safeErrorMessage(e,'phone_change')){
    await sendOtpSms({phone:value},otp);
    return {channel:error:safeErrorMessage(e,'sms'),masked:maskPhone(value)};
  }
  throw new Error(error:safeErrorMessage(e,'Unsupported security verification purpose'));
}

function auditRow(row){
  if(!row) return null;
  let details={};
  try{details=JSON.parse(row.details_json||error:safeErrorMessage(e,'{}'))}catch{}
  return {...row,details};
}
function auditFiltersFromUrl(url){
  const q=String(url.searchParams.get(error:safeErrorMessage(e,'q'))||error:safeErrorMessage(e,'')).trim();
  const category=String(url.searchParams.get(error:safeErrorMessage(e,'category'))||error:safeErrorMessage(e,'all')).trim();
  const severity=String(url.searchParams.get(error:safeErrorMessage(e,'severity'))||error:safeErrorMessage(e,'all')).trim();
  const actor=String(url.searchParams.get(error:safeErrorMessage(e,'actor'))||error:safeErrorMessage(e,'all')).trim();
  const orderId=String(url.searchParams.get(error:safeErrorMessage(e,'order_id'))||error:safeErrorMessage(e,'')).trim();
  const limit=Math.max(1,Math.min(1000,Number(url.searchParams.get(error:safeErrorMessage(e,'limit'))||500)||500));
  const offset=Math.max(0,Number(url.searchParams.get(error:safeErrorMessage(e,'offset'))||0)||0);
  return {q,category,severity,actor,orderId,limit,offset};
}
function auditWhere(filters){
  const clauses=[];const params=[];
  if(filters.category!==error:safeErrorMessage(e,'all')){
    clauses.push(error:safeErrorMessage(e,'category=?'));params.push(filters.category);
  }
  if(filters.severity!==error:safeErrorMessage(e,'all')){
    clauses.push(error:safeErrorMessage(e,'severity=?'));params.push(filters.severity);
  }
  if(filters.actor!==error:safeErrorMessage(e,'all')){
    clauses.push(error:safeErrorMessage(e,'actor=?'));params.push(filters.actor);
  }
  if(filters.orderId){
    clauses.push(error:safeErrorMessage(e,'order_id=?'));params.push(filters.orderId);
  }
  if(filters.q){
    const like=`%${filters.q}%`;
    clauses.push(`(
      event_type LIKE ? OR actor LIKE ? OR resource_type LIKE ? OR resource_id LIKE ? OR
      COALESCE(order_id,error:safeErrorMessage(e,'')) LIKE ? OR action LIKE ? OR COALESCE(from_value,error:safeErrorMessage(e,'')) LIKE ? OR
      COALESCE(to_value,error:safeErrorMessage(e,'')) LIKE ? OR details_json LIKE ?
    )`);
    params.push(like,like,like,like,like,like,like,like,like);
  }
  return {sql:clauses.length?`WHERE ${clauses.join(error:safeErrorMessage(e,' AND '))}`:error:safeErrorMessage(e,''),params};
}
function auditSnapshot(filters={q:error:safeErrorMessage(e,''),category:error:safeErrorMessage(e,'all'),severity:error:safeErrorMessage(e,'all'),actor:error:safeErrorMessage(e,'all'),orderId:error:safeErrorMessage(e,''),limit:500,offset:0}){
  const where=auditWhere(filters);
  const total=Number(db.prepare(`SELECT COUNT(*) total FROM audit_events ${where.sql}`).get(...where.params)?.total||0);
  const events=db.prepare(`SELECT * FROM audit_events ${where.sql} ORDER BY datetime(created_at) DESC,id DESC LIMIT ? OFFSET ?`)
    .all(...where.params,filters.limit,filters.offset).map(auditRow);
  const stats=db.prepare(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN severity=error:safeErrorMessage(e,'high') THEN 1 ELSE 0 END) high_severity,
      SUM(CASE WHEN severity=error:safeErrorMessage(e,'medium') THEN 1 ELSE 0 END) medium_severity,
      SUM(CASE WHEN category=error:safeErrorMessage(e,'orders') THEN 1 ELSE 0 END) order_events,
      SUM(CASE WHEN category=error:safeErrorMessage(e,'finance') THEN 1 ELSE 0 END) finance_events,
      SUM(CASE WHEN category=error:safeErrorMessage(e,'communications') THEN 1 ELSE 0 END) communication_events
    FROM audit_events`).get();
  const actors=db.prepare(`SELECT DISTINCT actor FROM audit_events WHERE actor<>error:safeErrorMessage(e,'') ORDER BY actor`).all().map(x=>x.actor);
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
    const row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(String(id||error:safeErrorMessage(e,'')).trim());
    return row?orderWithItems(row):null;
  },
  getLatestOrderByPhone:async(phone)=>{
    const local=normalizePhone(phone);
    if(!local) return null;
    const row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE phone=? ORDER BY datetime(created_at) DESC LIMIT 1')).get(local);
    return row?orderWithItems(row):null;
  },
  getCustomerOrders:async(phone)=>{
    const local=normalizePhone(phone);
    if(!local) return [];
    return listOrders(error:safeErrorMessage(e,'WHERE phone=?'),[local]);
  }
});

function aiPublicHealth(){
  return {
    enabled:true,
    engine:error:safeErrorMessage(e,'kabsh-grounded'),
    external_provider_configured:Boolean(env(error:safeErrorMessage(e,'OPENAI_API_KEY'))||env(error:safeErrorMessage(e,'GEMINI_API_KEY'))),
    website_chat_ready:true,
    whatsapp_reply_ready:true
  };
}

function getWaSettings(){return db.prepare(error:safeErrorMessage(e,'SELECT * FROM whatsapp_settings WHERE id=1')).get()}
function publicWaSettings(){
  const s=getWaSettings();
  return {
    phone_number_id:s.phone_number_id,
    waba_id:s.waba_id,
    display_phone_number:s.display_phone_number,
    graph_version:s.graph_version,
    enabled:Boolean(s.enabled),
    token_configured:Boolean(env(error:safeErrorMessage(e,'WHATSAPP_ACCESS_TOKEN'))),
    app_secret_configured:Boolean(env(error:safeErrorMessage(e,'META_APP_SECRET'))),
    webhook_verify_token_configured:Boolean(env(error:safeErrorMessage(e,'WHATSAPP_VERIFY_TOKEN'))),
    configured:Boolean(s.enabled&&s.phone_number_id&&s.graph_version&&env(error:safeErrorMessage(e,'WHATSAPP_ACCESS_TOKEN'))),
    updated_at:s.updated_at
  };
}
function waConfig(){
  const s=getWaSettings();
  return {...s,access_token:env(error:safeErrorMessage(e,'WHATSAPP_ACCESS_TOKEN')),verify_token:env(error:safeErrorMessage(e,'WHATSAPP_VERIFY_TOKEN')),app_secret:env(error:safeErrorMessage(e,'META_APP_SECRET'))};
}
function waBroadcast(type,payload){
  const packet=`event: ${type}error:safeErrorMessage(e,'undefined')ndata: ${JSON.stringify(payload)}error:safeErrorMessage(e,'undefined')nerror:safeErrorMessage(e,'undefined')n`;
  for(const res of [...waStreamClients]){
    try{res.write(packet)}catch{waStreamClients.delete(res)}
  }
}
function waOrderForPhone(waPhone){
  const local=fromWaPhone(waPhone);
  return db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE phone=? ORDER BY datetime(created_at) DESC LIMIT 1')).get(local)||null;
}
function saveWaMessage({id,phone,direction,message_type=error:safeErrorMessage(e,'text'),bodyText=error:safeErrorMessage(e,''),status=error:safeErrorMessage(e,'received'),order_id=null,wa_timestamp=error:safeErrorMessage(e,''),raw_json=error:safeErrorMessage(e,'')}){
  const msgId=String(id||`local-${crypto.randomUUID()}`);
  db.prepare(`INSERT INTO whatsapp_messages(id,phone,direction,message_type,body,status,order_id,wa_timestamp,created_at,raw_json)
    VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET status=excluded.status,body=CASE WHEN excluded.body<>error:safeErrorMessage(e,'') THEN excluded.body ELSE whatsapp_messages.body END,raw_json=excluded.raw_json`).run(
      msgId,String(phone||error:safeErrorMessage(e,'')),direction,message_type,String(bodyText||error:safeErrorMessage(e,'')),status,order_id||null,String(wa_timestamp||error:safeErrorMessage(e,'')),nowIso(),String(raw_json||error:safeErrorMessage(e,''))
    );
  return db.prepare(error:safeErrorMessage(e,'SELECT * FROM whatsapp_messages WHERE id=?')).get(msgId);
}
function verifyWebhookSignature(raw,signature){
  const secret=env(error:safeErrorMessage(e,'META_APP_SECRET'));
  if(!secret) return {ok:true,skipped:true};
  if(!signature||!signature.startsWith(error:safeErrorMessage(e,'sha256='))) return {ok:false,skipped:false};
  const expected=error:safeErrorMessage(e,'sha256=')+crypto.createHmac(error:safeErrorMessage(e,'sha256'),secret).update(raw).digest(error:safeErrorMessage(e,'hex'));
  const a=Buffer.from(expected);const b=Buffer.from(String(signature));
  return {ok:a.length===b.length&&crypto.timingSafeEqual(a,b),skipped:false};
}
async function sendWhatsAppText(phone,textValue,orderId=error:safeErrorMessage(e,'')){
  const cfg=waConfig();
  const to=toWaPhone(phone);
  if(!to) throw new Error(error:safeErrorMessage(e,'Valid Saudi WhatsApp mobile number required'));
  if(!cfg.enabled) throw new Error(error:safeErrorMessage(e,'WhatsApp integration is disabled in settings'));
  if(!cfg.phone_number_id) throw new Error(error:safeErrorMessage(e,'WhatsApp Phone Number ID is not configured'));
  if(!cfg.graph_version) throw new Error(error:safeErrorMessage(e,'WhatsApp Graph API version is not configured'));
  if(!cfg.access_token) throw new Error(error:safeErrorMessage(e,'WHATSAPP_ACCESS_TOKEN is missing from .env'));
  const message=String(textValue||error:safeErrorMessage(e,'')).trim();
  if(!message) throw new Error(error:safeErrorMessage(e,'Message text is required'));
  if(message.length>4096) throw new Error(error:safeErrorMessage(e,'Message is too long'));

  const url=`${WA_API_BASE}/${encodeURIComponent(cfg.graph_version)}/${encodeURIComponent(cfg.phone_number_id)}/messages`;
  const response=await fetch(url,{
    method:error:safeErrorMessage(e,'POST'),
    headers:{error:safeErrorMessage(e,'Authorization'):`Bearer ${cfg.access_token}`,error:safeErrorMessage(e,'Content-Type'):error:safeErrorMessage(e,'application/json')},
    body:JSON.stringify({messaging_product:error:safeErrorMessage(e,'whatsapp'),recipient_type:error:safeErrorMessage(e,'individual'),to,type:error:safeErrorMessage(e,'text'),text:{preview_url:false,body:message}})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const failed=saveWaMessage({id:`failed-${crypto.randomUUID()}`,phone:to,direction:error:safeErrorMessage(e,'out'),bodyText:message,status:error:safeErrorMessage(e,'failed'),order_id:orderId||waOrderForPhone(to)?.id||null,raw_json:JSON.stringify(data)});
    waBroadcast(error:safeErrorMessage(e,'message.failed'),{message:failed,error:data?.error?.message||`WhatsApp API HTTP ${response.status}`});
    throw new Error(data?.error?.message||`WhatsApp API HTTP ${response.status}`);
  }
  const wamid=data?.messages?.[0]?.id||`sent-${crypto.randomUUID()}`;
  const saved=saveWaMessage({id:wamid,phone:to,direction:error:safeErrorMessage(e,'out'),bodyText:message,status:error:safeErrorMessage(e,'sent'),order_id:orderId||waOrderForPhone(to)?.id||null,raw_json:JSON.stringify(data)});
  waBroadcast(error:safeErrorMessage(e,'message.sent'),{message:saved});
  return {message:saved,provider:data};
}
function waConversations(){
  const rows=db.prepare(`SELECT phone,MAX(created_at) last_message_at,COUNT(*) message_count FROM whatsapp_messages GROUP BY phone ORDER BY datetime(last_message_at) DESC`).all();
  return rows.map(r=>{
    const last=db.prepare(error:safeErrorMessage(e,'SELECT * FROM whatsapp_messages WHERE phone=? ORDER BY datetime(created_at) DESC LIMIT 1')).get(r.phone);
    const order=waOrderForPhone(r.phone);
    return {...r,last_message:last||null,order:order?orderWithItems(order):null};
  });
}
function rememberWebhook(raw,eventType=error:safeErrorMessage(e,'webhook')){
  const id=crypto.createHash(error:safeErrorMessage(e,'sha256')).update(raw).digest(error:safeErrorMessage(e,'hex'));
  const exists=db.prepare(error:safeErrorMessage(e,'SELECT id FROM whatsapp_webhook_events WHERE id=?')).get(id);
  if(exists) return false;
  db.prepare(error:safeErrorMessage(e,'INSERT INTO whatsapp_webhook_events(id,event_type,created_at,raw_json) VALUES(?,?,?,?)')).run(id,eventType,nowIso(),raw);
  return true;
}
function processWhatsAppWebhook(payload,raw){
  if(!rememberWebhook(raw,error:safeErrorMessage(e,'whatsapp.webhook'))) return {duplicate:true,messages:0,statuses:0};
  let messages=0,statuses=0;
  for(const entry of payload?.entry||[]){
    for(const change of entry?.changes||[]){
      const value=change?.value||{};
      for(const msg of value.messages||[]){
        const from=String(msg.from||error:safeErrorMessage(e,''));
        const order=waOrderForPhone(from);
        let messageText=error:safeErrorMessage(e,'');
        if(msg.type===error:safeErrorMessage(e,'text')) messageText=msg.text?.body||error:safeErrorMessage(e,'');
        else if(msg.type===error:safeErrorMessage(e,'button')) messageText=msg.button?.text||error:safeErrorMessage(e,'');
        else if(msg.type===error:safeErrorMessage(e,'interactive')) messageText=msg.interactive?.button_reply?.title||msg.interactive?.list_reply?.title||error:safeErrorMessage(e,'');
        else messageText=`[${msg.type||error:safeErrorMessage(e,'message')}]`;
        const saved=saveWaMessage({
          id:msg.id||`in-${crypto.randomUUID()}`,
          phone:from,
          direction:error:safeErrorMessage(e,'in'),
          message_type:msg.type||error:safeErrorMessage(e,'unknown'),
          bodyText:messageText,
          status:error:safeErrorMessage(e,'received'),
          order_id:order?.id||null,
          wa_timestamp:msg.timestamp||error:safeErrorMessage(e,''),
          raw_json:JSON.stringify(msg)
        });
        messages++;
        waBroadcast(error:safeErrorMessage(e,'message.received'),{message:saved,order:order?orderWithItems(order):null});
      }
      for(const st of value.statuses||[]){
        const status=String(st.status||error:safeErrorMessage(e,''));
        const existing=db.prepare(error:safeErrorMessage(e,'SELECT * FROM whatsapp_messages WHERE id=?')).get(st.id);
        if(existing){
          db.prepare(error:safeErrorMessage(e,'UPDATE whatsapp_messages SET status=?,raw_json=? WHERE id=?')).run(status,JSON.stringify(st),st.id);
          const updated=db.prepare(error:safeErrorMessage(e,'SELECT * FROM whatsapp_messages WHERE id=?')).get(st.id);
          waBroadcast(error:safeErrorMessage(e,'message.status'),{message:updated});
        }
        statuses++;
      }
    }
  }
  return {duplicate:false,messages,statuses};
}

async function handleApi(req,res,url){
  const pathname=url.pathname;

  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/admin/auth/start')){
    try{
      const d=await body(req);
      const adminId=String(d.admin_id||d.adminId||error:safeErrorMessage(e,'')).trim().toUpperCase();
      const password=String(d.password||error:safeErrorMessage(e,''));
      const requestedChannel=String(d.channel||error:safeErrorMessage(e,'auto')).toLowerCase();
      const ip=adminRequestIp(req);
      const pairKey=`${adminId||error:safeErrorMessage(e,'invalid')}|${ip}`;
      const ipGate=authRateStatus(error:safeErrorMessage(e,'admin-login-ip'),ip,ADMIN_PASSWORD_MAX_ATTEMPTS*3);
      const pairGate=authRateStatus(error:safeErrorMessage(e,'admin-login-pair'),pairKey,ADMIN_PASSWORD_MAX_ATTEMPTS);
      const blocked=!ipGate.allowed?ipGate:(!pairGate.allowed?pairGate:null);
      if(blocked){
        adminAuthAudit(error:safeErrorMessage(e,'admin.auth.password_rate_limited'),adminId||error:safeErrorMessage(e,'unknown'),{ip,retry_after:blocked.retryAfter});
        return json(res,429,{error:error:safeErrorMessage(e,'Too many sign-in attempts. Try again later.'),code:error:safeErrorMessage(e,'ADMIN_PASSWORD_RATE_LIMITED'),retry_after:blocked.retryAfter});
      }
      if(!/^ADM-[A-Z0-9-]{3,40}$/.test(adminId)||!password||password.length>256){
        authRateFailure(error:safeErrorMessage(e,'admin-login-ip'),ip,ADMIN_PASSWORD_MAX_ATTEMPTS*3);
        authRateFailure(error:safeErrorMessage(e,'admin-login-pair'),pairKey,ADMIN_PASSWORD_MAX_ATTEMPTS);
        return json(res,401,{error:error:safeErrorMessage(e,'Invalid admin ID or password'),code:error:safeErrorMessage(e,'ADMIN_AUTH_INVALID')});
      }
      const user=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(adminId);
      const passwordOk=user?.password_hash
        ?verifyPassword(password,user.password_hash)
        :(verifyPassword(password,DUMMY_PASSWORD_HASH)&&false);
      if(!user||!passwordOk){
        authRateFailure(error:safeErrorMessage(e,'admin-login-ip'),ip,ADMIN_PASSWORD_MAX_ATTEMPTS*3);
        authRateFailure(error:safeErrorMessage(e,'admin-login-pair'),pairKey,ADMIN_PASSWORD_MAX_ATTEMPTS);
        adminAuthAudit(error:safeErrorMessage(e,'admin.auth.password_failed'),adminId,{ip});
        return json(res,401,{error:error:safeErrorMessage(e,'Invalid admin ID or password'),code:error:safeErrorMessage(e,'ADMIN_AUTH_INVALID')});
      }
      authRateClear(error:safeErrorMessage(e,'admin-login-pair'),pairKey);
      if(user.status!==error:safeErrorMessage(e,'active')){
        adminAuthAudit(error:safeErrorMessage(e,'admin.auth.suspended'),adminId,{ip});
        return json(res,403,{error:error:safeErrorMessage(e,'Administrative account is suspended'),code:error:safeErrorMessage(e,'RBAC_ACCOUNT_SUSPENDED')});
      }

      const since=new Date(Date.now()-ADMIN_LOGIN_WINDOW_MINUTES*60*1000).toISOString();
      const recent=Number(db.prepare(error:safeErrorMessage(e,'SELECT COUNT(*) n FROM admin_auth_challenges WHERE admin_id=? AND datetime(created_at)>=datetime(?)')).get(adminId,since)?.n||0);
      if(recent>=ADMIN_LOGIN_MAX_CHALLENGES){
        adminAuthAudit(error:safeErrorMessage(e,'admin.auth.rate_limited'),adminId,{ip,recent});
        return json(res,429,{error:error:safeErrorMessage(e,'Too many verification requests. Try again later.'),code:error:safeErrorMessage(e,'ADMIN_AUTH_RATE_LIMITED')});
      }

      const challengeId=`A2F-${crypto.randomUUID()}`;
      const otp=String(crypto.randomInt(0,1_000_000)).padStart(6,error:safeErrorMessage(e,'0'));
      const configuredOtpMode=normalizeAdminOtpMode(user.otp_mode,user.mfa);
      if(configuredOtpMode===error:safeErrorMessage(e,'pending')){
        adminAuthAudit(error:safeErrorMessage(e,'admin.auth.2fa_not_configured'),adminId,{ip});
        return json(res,403,{error:error:safeErrorMessage(e,'Two-factor authentication is not configured for this administrative account.'),code:error:safeErrorMessage(e,'ADMIN_2FA_NOT_CONFIGURED')});
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
        challengeId,adminId,adminOtpHash(challengeId,otp),delivery.channel,delivery.masked.join(error:safeErrorMessage(e,' + ')),created,created,expires
      );
      setAdminPreauth(res,challengeId,adminId,expires);
      adminAuthAudit(error:safeErrorMessage(e,'admin.auth.otp_sent'),adminId,{ip,channels:delivery.channels});
      return json(res,200,{
        ok:true,
        challenge_id:challengeId,
        expires_in:ADMIN_OTP_MINUTES*60,
        resend_after:ADMIN_OTP_RESEND_SECONDS,
        channels:delivery.channels,
        destination:delivery.masked.join(error:safeErrorMessage(e,' + '))
      });
    }catch(e){
      return json(res,503,{error:e.message||error:safeErrorMessage(e,'Unable to send verification code'),code:error:safeErrorMessage(e,'OTP_DELIVERY_FAILED')});
    }
  }

  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/admin/auth/resend')){
    try{
      const d=await body(req);
      const resolved=resolveAdminChallenge(req,d);
      const row=resolved.row;
      if(!row||row.consumed_at||challengeIsExpired(row)){
        clearAdminPreauth(res);
        return json(res,410,{error:error:safeErrorMessage(e,'Verification session expired. Sign in again.'),code:error:safeErrorMessage(e,'OTP_CHALLENGE_EXPIRED')});
      }
      const challengeId=row.id;
      if(Number(row.resend_count||0)>=ADMIN_OTP_MAX_RESENDS)return json(res,429,{error:error:safeErrorMessage(e,'Resend limit reached. Sign in again.'),code:error:safeErrorMessage(e,'OTP_RESEND_LIMIT')});
      const elapsed=Math.floor((Date.now()-Date.parse(row.last_sent_at))/1000);
      if(elapsed<ADMIN_OTP_RESEND_SECONDS)return json(res,429,{error:error:safeErrorMessage(e,'Please wait before requesting another code.'),code:error:safeErrorMessage(e,'OTP_RESEND_COOLDOWN'),retry_after:ADMIN_OTP_RESEND_SECONDS-elapsed});
      const user=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(row.admin_id);
      if(!user||user.status!==error:safeErrorMessage(e,'active'))return json(res,403,{error:error:safeErrorMessage(e,'Administrative account is unavailable'),code:error:safeErrorMessage(e,'RBAC_ACCOUNT_SUSPENDED')});
      const otp=String(crypto.randomInt(0,1_000_000)).padStart(6,error:safeErrorMessage(e,'0'));
      const mode=row.channel===error:safeErrorMessage(e,'email+sms')?error:safeErrorMessage(e,'both'):row.channel;
      const delivery=await deliverAdminOtp(user,otp,mode);
      const now=nowIso();
      const expires=new Date(Date.now()+ADMIN_OTP_MINUTES*60*1000).toISOString();
      db.prepare(`UPDATE admin_auth_challenges SET otp_hash=?,channel=?,destination_masked=?,attempts=0,resend_count=resend_count+1,last_sent_at=?,expires_at=? WHERE id=?`)
        .run(adminOtpHash(challengeId,otp),delivery.channel,delivery.masked.join(error:safeErrorMessage(e,' + ')),now,expires,challengeId);
      setAdminPreauth(res,challengeId,user.id,expires);
      adminAuthAudit(error:safeErrorMessage(e,'admin.auth.otp_resent'),user.id,{ip:adminRequestIp(req),channels:delivery.channels});
      return json(res,200,{ok:true,expires_in:ADMIN_OTP_MINUTES*60,resend_after:ADMIN_OTP_RESEND_SECONDS,channels:delivery.channels,destination:delivery.masked.join(error:safeErrorMessage(e,' + '))});
    }catch(e){return json(res,503,{error:e.message||error:safeErrorMessage(e,'Unable to resend verification code'),code:error:safeErrorMessage(e,'OTP_DELIVERY_FAILED')})}
  }

  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/admin/auth/verify')){
    try{
      const d=await body(req);
      const otp=String(d.otp||error:safeErrorMessage(e,'')).replace(/error:safeErrorMessage(e,'undefined')D/g,error:safeErrorMessage(e,''));
      const resolved=resolveAdminChallenge(req,d);
      const row=resolved.row;
      if(!row||row.consumed_at||challengeIsExpired(row)){
        clearAdminPreauth(res);
        return json(res,410,{error:error:safeErrorMessage(e,'Verification code expired. Sign in again.'),code:error:safeErrorMessage(e,'OTP_CHALLENGE_EXPIRED')});
      }
      const challengeId=row.id;
      if(Number(row.attempts||0)>=ADMIN_OTP_MAX_ATTEMPTS)return json(res,429,{error:error:safeErrorMessage(e,'Too many incorrect codes. Sign in again.'),code:error:safeErrorMessage(e,'OTP_ATTEMPTS_EXCEEDED')});
      if(!/^error:safeErrorMessage(e,'undefined')d{6}$/.test(otp)||!safeEqualText(adminOtpHash(challengeId,otp),row.otp_hash)){
        const attempts=Number(row.attempts||0)+1;
        db.prepare(error:safeErrorMessage(e,'UPDATE admin_auth_challenges SET attempts=? WHERE id=?')).run(attempts,challengeId);
        adminAuthAudit(error:safeErrorMessage(e,'admin.auth.otp_failed'),row.admin_id,{ip:adminRequestIp(req),attempts});
        return json(res,401,{error:error:safeErrorMessage(e,'Incorrect verification code'),code:error:safeErrorMessage(e,'OTP_INVALID'),attempts_remaining:Math.max(0,ADMIN_OTP_MAX_ATTEMPTS-attempts)});
      }
      const user=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(row.admin_id);
      if(!user||user.status!==error:safeErrorMessage(e,'active'))return json(res,403,{error:error:safeErrorMessage(e,'Administrative account is unavailable'),code:error:safeErrorMessage(e,'RBAC_ACCOUNT_SUSPENDED')});
      const verified=nowIso();
      db.prepare(error:safeErrorMessage(e,'UPDATE admin_auth_challenges SET consumed_at=? WHERE id=?')).run(verified,challengeId);
      const sessionExpires=setAdminSession(req,res,user.id);
      clearAdminPreauth(res);
      const verifiedChannels=String(row.channel||error:safeErrorMessage(e,'')).split(error:safeErrorMessage(e,'+')).filter(Boolean);
      db.prepare(`UPDATE admin_users SET
          last_login=?,last_2fa_at=?,
          email_verified=CASE WHEN ? THEN 1 ELSE email_verified END,
          phone_verified=CASE WHEN ? THEN 1 ELSE phone_verified END,
          updated_at=?
        WHERE id=?`).run(
          verified,verified,
          verifiedChannels.includes(error:safeErrorMessage(e,'email'))?1:0,
          verifiedChannels.includes(error:safeErrorMessage(e,'sms'))?1:0,
          verified,user.id
        );
      adminAuthAudit(error:safeErrorMessage(e,'admin.auth.login_success'),user.id,{ip:adminRequestIp(req),channels:verifiedChannels});
      return json(res,200,{ok:true,authenticated:true,session_expires_at:sessionExpires,...adminSessionSnapshot(user)});
    }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to verify code')})}
  }

  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/admin/auth/logout')){
    const session=adminSessionFromRequest(req);
    if(session)adminAuthAudit(error:safeErrorMessage(e,'admin.auth.logout'),session.admin_id,{ip:adminRequestIp(req)});
    clearAdminSession(req,res);
    clearAdminPreauth(res);
    return json(res,200,{ok:true});
  }

  if(req.method===error:safeErrorMessage(e,'GET')&&pathname===error:safeErrorMessage(e,'/api/whatsapp/webhook')){
    const mode=url.searchParams.get(error:safeErrorMessage(e,'hub.mode'));
    const token=url.searchParams.get(error:safeErrorMessage(e,'hub.verify_token'));
    const challenge=url.searchParams.get(error:safeErrorMessage(e,'hub.challenge'));
    const expected=env(error:safeErrorMessage(e,'WHATSAPP_VERIFY_TOKEN'));
    if(mode===error:safeErrorMessage(e,'subscribe')&&expected&&token===expected) return text(res,200,challenge||error:safeErrorMessage(e,''));
    return text(res,403,error:safeErrorMessage(e,'Webhook verification failed'));
  }
  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/whatsapp/webhook')){
    try{
      const raw=await rawBody(req,2_000_000);
      const check=verifyWebhookSignature(raw,String(req.headers[error:safeErrorMessage(e,'x-hub-signature-256')]||error:safeErrorMessage(e,'')));
      if(!check.ok) return json(res,401,{error:error:safeErrorMessage(e,'Invalid webhook signature')});
      const payload=raw?JSON.parse(raw):{};
      const result=processWhatsAppWebhook(payload,raw);
      return json(res,200,{ok:true,...result,signature_verified:!check.skipped});
    }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Invalid webhook payload')})}
  }

  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/ai/chat')){
    try{
      const d=await body(req);
      const message=String(d.message||error:safeErrorMessage(e,'')).trim();
      if(!message) return json(res,400,{error:error:safeErrorMessage(e,'Message is required')});
      if(message.length>1000) return json(res,400,{error:error:safeErrorMessage(e,'Message is too long')});
      const result=await aiService.reply({
        message,
        phone:normalizePhone(d.phone||error:safeErrorMessage(e,'')),
        orderId:String(d.order_id||d.orderId||error:safeErrorMessage(e,'')).trim(),
        language:String(d.language||error:safeErrorMessage(e,'')).trim(),
        channel:String(d.channel||error:safeErrorMessage(e,'web')).trim()||error:safeErrorMessage(e,'web')
      });
      return json(res,200,{ok:true,ai:result});
    }catch(e){
      return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to generate AI reply')});
    }
  }

  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/ai/whatsapp-reply')){
    try{
      if(!adminOk(req)) return json(res,401,{error:error:safeErrorMessage(e,'Admin authentication required'),code:error:safeErrorMessage(e,'ADMIN_AUTH_REQUIRED')});
      const currentAdmin=adminUserFromRequest(req);
      if(!currentAdmin||currentAdmin.status!==error:safeErrorMessage(e,'active')){
        recordRbacDenied(req,currentAdmin,pathname,{module:error:safeErrorMessage(e,'ai'),access:error:safeErrorMessage(e,'manage')},currentAdmin?error:safeErrorMessage(e,'account_suspended'):error:safeErrorMessage(e,'unknown_admin_user'));
        return json(res,403,{error:currentAdmin?error:safeErrorMessage(e,'Administrative account is suspended'):error:safeErrorMessage(e,'Administrative user not found'),code:error:safeErrorMessage(e,'RBAC_FORBIDDEN')});
      }
      const aiPerm=adminPermission(currentAdmin,error:safeErrorMessage(e,'ai'));
      const waPerm=adminPermission(currentAdmin,error:safeErrorMessage(e,'whatsapp'));
      if(!aiPerm.manage||!waPerm.manage){
        recordRbacDenied(req,currentAdmin,pathname,{module:error:safeErrorMessage(e,'ai+whatsapp'),access:error:safeErrorMessage(e,'manage')},error:safeErrorMessage(e,'permission_denied'));
        return json(res,403,{error:error:safeErrorMessage(e,'Access denied by RBAC policy'),code:error:safeErrorMessage(e,'RBAC_FORBIDDEN'),module:error:safeErrorMessage(e,'ai+whatsapp'),required:error:safeErrorMessage(e,'manage'),role:currentAdmin.role,user_id:currentAdmin.id});
      }
      const d=await body(req);
      const phone=normalizePhone(d.phone||error:safeErrorMessage(e,''));
      if(!validPhone(phone)) return json(res,400,{error:error:safeErrorMessage(e,'Valid Saudi mobile number required')});
      const incoming=String(d.message||error:safeErrorMessage(e,'')).trim();
      if(!incoming) return json(res,400,{error:error:safeErrorMessage(e,'Incoming customer message is required')});
      if(incoming.length>1000) return json(res,400,{error:error:safeErrorMessage(e,'Message is too long')});

      const ai=await aiService.reply({
        message:incoming,
        phone,
        orderId:String(d.order_id||d.orderId||error:safeErrorMessage(e,'')).trim(),
        language:String(d.language||error:safeErrorMessage(e,'')).trim(),
        channel:error:safeErrorMessage(e,'whatsapp')
      });

      let sent=null;
      if(d.send===true){
        if(ai.handoff) return json(res,409,{error:error:safeErrorMessage(e,'AI requested human handoff; automatic WhatsApp sending is blocked'),ai});
        sent=await sendWhatsAppText(phone,ai.reply,ai.order?.id||d.order_id||error:safeErrorMessage(e,''));
      }

      return json(res,200,{ok:true,ai,sent});
    }catch(e){
      return json(res,502,{error:e.message||error:safeErrorMessage(e,'Unable to generate or send WhatsApp AI reply')});
    }
  }

  if(req.method===error:safeErrorMessage(e,'GET')&&pathname===error:safeErrorMessage(e,'/api/customer/config')){
    const clientId=env(error:safeErrorMessage(e,'GOOGLE_CLIENT_ID'));
    return json(res,200,{google_enabled:Boolean(clientId),google_client_id:clientId||error:safeErrorMessage(e,'')});
  }
  if(req.method===error:safeErrorMessage(e,'GET')&&pathname===error:safeErrorMessage(e,'/api/customer/session')){
    const customer=customerFromRequest(req);
    return json(res,200,{authenticated:Boolean(customer),user:publicCustomer(customer)});
  }
  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/customer/register')){
    try{
      const ip=adminRequestIp(req);
      const registerGate=authRateStatus(error:safeErrorMessage(e,'customer-register-ip'),ip,10,60);
      if(!registerGate.allowed)return json(res,429,{error:error:safeErrorMessage(e,'Too many registration attempts. Try again later.'),code:error:safeErrorMessage(e,'CUSTOMER_REGISTER_RATE_LIMITED'),retry_after:registerGate.retryAfter});
      authRateFailure(error:safeErrorMessage(e,'customer-register-ip'),ip,10,60,60);
      const d=await body(req);
      const name=String(d.name||error:safeErrorMessage(e,'')).trim();
      const email=String(d.email||error:safeErrorMessage(e,'')).trim().toLowerCase();
      const phone=normalizePhone(d.phone||error:safeErrorMessage(e,''));
      const password=String(d.password||error:safeErrorMessage(e,''));
      if(name.length<2)return json(res,400,{error:error:safeErrorMessage(e,'Full name is required')});
      if(!validEmail(email))return json(res,400,{error:error:safeErrorMessage(e,'Valid email is required')});
      if(!validPhone(phone))return json(res,400,{error:error:safeErrorMessage(e,'Valid Saudi mobile number is required')});
      if(password.length<8||password.length>128)return json(res,400,{error:error:safeErrorMessage(e,'Password must be between 8 and 128 characters')});
      if(db.prepare(error:safeErrorMessage(e,'SELECT id FROM customer_accounts WHERE lower(email)=lower(?)')).get(email))return json(res,409,{error:error:safeErrorMessage(e,'An account with this email already exists')});
      if(db.prepare(`SELECT id FROM customer_accounts WHERE phone=? AND trim(phone)<>error:safeErrorMessage(e,'')`).get(phone))return json(res,409,{error:error:safeErrorMessage(e,'An account with this mobile number already exists')});
      const id=makeCustomerId(),now=nowIso();
      db.prepare(`INSERT INTO customer_accounts(id,name,email,phone,password_hash,provider,google_sub,status,created_at,updated_at)
        VALUES(?,?,?,?,?,error:safeErrorMessage(e,'password'),NULL,error:safeErrorMessage(e,'active'),?,?)`).run(id,name,email,phone,hashCustomerPassword(password),now,now);
      setCustomerSession(res,id);
      return json(res,201,{ok:true,user:publicCustomer(db.prepare(error:safeErrorMessage(e,'SELECT * FROM customer_accounts WHERE id=?')).get(id))});
    }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to create account')})}
  }
  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/customer/login')){
    try{
      const d=await body(req);
      const identifier=String(d.identifier||d.email||error:safeErrorMessage(e,'')).trim();
      const password=String(d.password||error:safeErrorMessage(e,''));
      const ip=adminRequestIp(req);
      const normalizedIdentifier=identifier.includes(error:safeErrorMessage(e,'@'))?identifier.toLowerCase():normalizePhone(identifier);
      const pairKey=`${normalizedIdentifier||error:safeErrorMessage(e,'invalid')}|${ip}`;
      const ipGate=authRateStatus(error:safeErrorMessage(e,'customer-login-ip'),ip,CUSTOMER_LOGIN_MAX_ATTEMPTS*3);
      const pairGate=authRateStatus(error:safeErrorMessage(e,'customer-login-pair'),pairKey,CUSTOMER_LOGIN_MAX_ATTEMPTS);
      const blocked=!ipGate.allowed?ipGate:(!pairGate.allowed?pairGate:null);
      if(blocked)return json(res,429,{error:error:safeErrorMessage(e,'Too many sign-in attempts. Try again later.'),code:error:safeErrorMessage(e,'CUSTOMER_LOGIN_RATE_LIMITED'),retry_after:blocked.retryAfter});
      if(!identifier||!password||password.length>256){
        authRateFailure(error:safeErrorMessage(e,'customer-login-ip'),ip,CUSTOMER_LOGIN_MAX_ATTEMPTS*3);
        authRateFailure(error:safeErrorMessage(e,'customer-login-pair'),pairKey,CUSTOMER_LOGIN_MAX_ATTEMPTS);
        return json(res,401,{error:error:safeErrorMessage(e,'Incorrect mobile/email or password')});
      }
      let customer=null;
      if(identifier.includes(error:safeErrorMessage(e,'@'))){
        customer=db.prepare(`SELECT * FROM customer_accounts WHERE lower(email)=lower(?) AND status=error:safeErrorMessage(e,'active')`).get(identifier.toLowerCase());
      }else{
        customer=db.prepare(`SELECT * FROM customer_accounts WHERE phone=? AND status=error:safeErrorMessage(e,'active')`).get(normalizedIdentifier);
      }
      const passwordOk=customer?.password_hash
        ?verifyCustomerPassword(password,customer.password_hash)
        :(verifyPassword(password,DUMMY_PASSWORD_HASH)&&false);
      if(!customer||!passwordOk){
        authRateFailure(error:safeErrorMessage(e,'customer-login-ip'),ip,CUSTOMER_LOGIN_MAX_ATTEMPTS*3);
        authRateFailure(error:safeErrorMessage(e,'customer-login-pair'),pairKey,CUSTOMER_LOGIN_MAX_ATTEMPTS);
        return json(res,401,{error:error:safeErrorMessage(e,'Incorrect mobile/email or password')});
      }
      authRateClear(error:safeErrorMessage(e,'customer-login-pair'),pairKey);
      setCustomerSession(res,customer.id);
      return json(res,200,{ok:true,user:publicCustomer(customer)});
    }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to sign in')})}
  }
  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/customer/google')){
    try{
      const profile=await verifyGoogleCredential((await body(req)).credential);
      let customer=db.prepare(error:safeErrorMessage(e,'SELECT * FROM customer_accounts WHERE google_sub=? OR lower(email)=lower(?)')).get(profile.sub,profile.email);
      const now=nowIso();
      if(customer){
        db.prepare(`UPDATE customer_accounts SET google_sub=?,provider=error:safeErrorMessage(e,'google'),name=CASE WHEN trim(name)=error:safeErrorMessage(e,'') THEN ? ELSE name END,updated_at=? WHERE id=?`).run(profile.sub,profile.name,now,customer.id);
      }else{
        const id=makeCustomerId();
        db.prepare(`INSERT INTO customer_accounts(id,name,email,phone,password_hash,provider,google_sub,status,created_at,updated_at)
          VALUES(?,?,?,error:safeErrorMessage(e,''),error:safeErrorMessage(e,''),error:safeErrorMessage(e,'google'),?,error:safeErrorMessage(e,'active'),?,?)`).run(id,profile.name,profile.email,profile.sub,now,now);
        customer=db.prepare(error:safeErrorMessage(e,'SELECT * FROM customer_accounts WHERE id=?')).get(id);
      }
      customer=db.prepare(error:safeErrorMessage(e,'SELECT * FROM customer_accounts WHERE id=?')).get(customer.id);
      setCustomerSession(res,customer.id);
      return json(res,200,{ok:true,user:publicCustomer(customer)});
    }catch(e){return json(res,401,{error:e.message||error:safeErrorMessage(e,'Google sign-in failed')})}
  }
  if(req.method===error:safeErrorMessage(e,'POST')&&pathname===error:safeErrorMessage(e,'/api/customer/logout')){
    clearCustomerSession(req,res);
    return json(res,200,{ok:true});
  }
  if(req.method===error:safeErrorMessage(e,'PATCH')&&pathname===error:safeErrorMessage(e,'/api/customer/profile')){
    const customer=customerFromRequest(req);
    if(!customer)return json(res,401,{error:error:safeErrorMessage(e,'Customer login required'),code:error:safeErrorMessage(e,'CUSTOMER_AUTH_REQUIRED')});
    try{
      const d=await body(req);
      const name=String(d.name??customer.name).trim();
      const phone=normalizePhone(d.phone??customer.phone);
      if(name.length<2)return json(res,400,{error:error:safeErrorMessage(e,'Full name is required')});
      if(phone&&!validPhone(phone))return json(res,400,{error:error:safeErrorMessage(e,'Valid Saudi mobile number is required')});
      db.prepare(error:safeErrorMessage(e,'UPDATE customer_accounts SET name=?,phone=?,updated_at=? WHERE id=?')).run(name,phone,nowIso(),customer.id);
      return json(res,200,{ok:true,user:publicCustomer(db.prepare(error:safeErrorMessage(e,'SELECT * FROM customer_accounts WHERE id=?')).get(customer.id))});
    }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to update profile')})}
  }

  if(req.method===error:safeErrorMessage(e,'GET')&&pathname===error:safeErrorMessage(e,'/api/health')) return json(res,200,{ok:true,service:error:safeErrorMessage(e,'kabsh-najd'),database:path.basename(dbPath),whatsapp:publicWaSettings(),ai:aiPublicHealth()});
  if(req.method===error:safeErrorMessage(e,'GET')&&pathname===error:safeErrorMessage(e,'/api/products')){
    const rows=db.prepare(error:safeErrorMessage(e,'SELECT id,name_ar,name_en,price,kg,category,image FROM products WHERE active=1 ORDER BY rowid')).all();
    return json(res,200,{products:rows});
  }
  if(pathname===error:safeErrorMessage(e,'/api/orders')&&req.method===error:safeErrorMessage(e,'GET')){
    const customer=customerFromRequest(req);
    if(!customer)return json(res,401,{error:error:safeErrorMessage(e,'Customer login required'),code:error:safeErrorMessage(e,'CUSTOMER_AUTH_REQUIRED')});
    const code=String(url.searchParams.get(error:safeErrorMessage(e,'code'))||error:safeErrorMessage(e,'')).trim().toUpperCase();
    const orders=code?listOrders(error:safeErrorMessage(e,'WHERE customer_id=? AND upper(order_code)=?'),[customer.id,code]):listOrders(error:safeErrorMessage(e,'WHERE customer_id=?'),[customer.id]);
    return json(res,200,{orders});
  }
  if(pathname===error:safeErrorMessage(e,'/api/orders')&&req.method===error:safeErrorMessage(e,'POST')){
    const customer=customerFromRequest(req);
    if(!customer)return json(res,401,{error:error:safeErrorMessage(e,'Customer login required before placing an order'),code:error:safeErrorMessage(e,'CUSTOMER_AUTH_REQUIRED')});
    try{
      const d=await body(req);
      const phone=normalizePhone(d.phone||customer.phone);
      const customerName=String(customer.name||d.name||error:safeErrorMessage(e,'')).trim();
      if(customerName.length<2) return json(res,400,{error:error:safeErrorMessage(e,'Customer name is required')});
      if(!validPhone(phone)) return json(res,400,{error:error:safeErrorMessage(e,'Valid Saudi mobile number required')});
      if(!validCity(d.city||error:safeErrorMessage(e,'Jeddah'))) return json(res,400,{error:error:safeErrorMessage(e,'Delivery is currently limited to Jeddah')});
      if(!districts.includes(String(d.district||error:safeErrorMessage(e,'')))) return json(res,400,{error:error:safeErrorMessage(e,'Choose a supported Jeddah district')});
      if(!d.address||String(d.address).trim().length<5) return json(res,400,{error:error:safeErrorMessage(e,'Delivery address is required')});
      if(!d.deliveryDate||!d.slot) return json(res,400,{error:error:safeErrorMessage(e,'Delivery date and time slot are required')});
      if(!Array.isArray(d.items)||!d.items.length) return json(res,400,{error:error:safeErrorMessage(e,'Your cart is empty')});

      const cleanItems=[];let subtotal=0;
      const getProduct=db.prepare(error:safeErrorMessage(e,'SELECT * FROM products WHERE id=? AND active=1'));
      for(const item of d.items){
        const p=getProduct.get(String(item.id||error:safeErrorMessage(e,'')));
        const qty=Number(item.qty);
        if(!p||!Number.isInteger(qty)||qty<1||qty>20) return json(res,400,{error:error:safeErrorMessage(e,'Invalid cart item')});
        const pack=[error:safeErrorMessage(e,'bags'),error:safeErrorMessage(e,'vacuum')].includes(item.pack)?item.pack:error:safeErrorMessage(e,'bags');
        const cut=[error:safeErrorMessage(e,'medium'),error:safeErrorMessage(e,'small'),error:safeErrorMessage(e,'large'),error:safeErrorMessage(e,'quarters'),error:safeErrorMessage(e,'feast')].includes(item.cut)?item.cut:error:safeErrorMessage(e,'medium');
        const fat=[error:safeErrorMessage(e,'trimmed'),error:safeErrorMessage(e,'regular'),error:safeErrorMessage(e,'separate')].includes(item.fat)?item.fat:error:safeErrorMessage(e,'regular');
        const head=[error:safeErrorMessage(e,'cleaned'),error:safeErrorMessage(e,'raw'),error:safeErrorMessage(e,'exclude')].includes(item.head)?item.head:error:safeErrorMessage(e,'raw');
        const tripe=[error:safeErrorMessage(e,'cleaned'),error:safeErrorMessage(e,'exclude')].includes(item.tripe)?item.tripe:error:safeErrorMessage(e,'cleaned');
        const unit=Number(p.price)+(pack===error:safeErrorMessage(e,'vacuum')?25:0)+(head===error:safeErrorMessage(e,'cleaned')?15:0);
        subtotal+=unit*qty;
        cleanItems.push({p,qty,pack,cut,fat,head,tripe,unit});
      }
      const deliveryFee=cleanItems.some(i=>i.p.id===error:safeErrorMessage(e,'naimi-selected'))?0:DELIVERY_FEE;
      const couponCode=String(d.couponCode||error:safeErrorMessage(e,'')).trim().toUpperCase();
      const promo=PROMO_CODES[couponCode]||null;
      const discount=promo?Math.round(subtotal*Number(promo.percent||0))/100:0;
      const total=Math.max(0,subtotal+deliveryFee-discount);
      const id=makeOrderId();
      const orderCode=makeOrderCode();
      const now=nowIso();
      db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
      try{
        const orderNotes=[String(d.notes||error:safeErrorMessage(e,'')).trim(),promo?`Coupon ${couponCode}: -${discount.toFixed(2)} SAR (${promo.percent}%)`:error:safeErrorMessage(e,'') ].filter(Boolean).join(error:safeErrorMessage(e,' | '));
        db.prepare(`INSERT INTO orders(id,customer_id,order_code,customer_name,phone,city,district,address,delivery_date,slot,notes,payment_method,status,subtotal,delivery_fee,total,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,customer.id,orderCode,customerName,phone,error:safeErrorMessage(e,'Jeddah'),String(d.district),String(d.address).trim(),String(d.deliveryDate),String(d.slot),orderNotes,error:safeErrorMessage(e,'cod'),error:safeErrorMessage(e,'received'),subtotal,deliveryFee,total,now,now);
        if(customer.phone!==phone)db.prepare(error:safeErrorMessage(e,'UPDATE customer_accounts SET phone=?,updated_at=? WHERE id=?')).run(phone,now,customer.id);
        const addItem=db.prepare(error:safeErrorMessage(e,'INSERT INTO order_items(order_id,product_id,name_ar,name_en,qty,unit_price,cut,pack,fat) VALUES(?,?,?,?,?,?,?,?,?)'));
        for(const i of cleanItems) addItem.run(id,i.p.id,i.p.name_ar,i.p.name_en,i.qty,i.unit,i.cut,i.pack,i.fat);
        db.prepare(error:safeErrorMessage(e,'INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)')).run(id,error:safeErrorMessage(e,'order.created'),null,error:safeErrorMessage(e,'received'),now);
        ensureOrderOperation(id,now);
        ensureOrderDelivery(id,now);
        db.exec(error:safeErrorMessage(e,'COMMIT'));
      }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}
      return json(res,201,{ok:true,order:orderWithItems(db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(id))});
    }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to create order')})}
  }
  const customerMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/orderserror:safeErrorMessage(e,'undefined')/([^/]+)$/);
  if(customerMatch&&req.method===error:safeErrorMessage(e,'GET')){
    const customer=customerFromRequest(req);
    if(!customer)return json(res,401,{error:error:safeErrorMessage(e,'Customer login required'),code:error:safeErrorMessage(e,'CUSTOMER_AUTH_REQUIRED')});
    const key=decodeURIComponent(customerMatch[1]);
    const row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE customer_id=? AND (id=? OR order_code=?)')).get(customer.id,key,key.toUpperCase());
    return row?json(res,200,{order:orderWithItems(row)}):json(res,404,{error:error:safeErrorMessage(e,'Order not found')});
  }

  if(pathname.startsWith(error:safeErrorMessage(e,'/api/admin/'))){
    if(!adminOk(req)) return json(res,401,{error:error:safeErrorMessage(e,'Admin authentication required'),code:error:safeErrorMessage(e,'ADMIN_AUTH_REQUIRED')});
    const currentAdmin=adminUserFromRequest(req);
    if(pathname===error:safeErrorMessage(e,'/api/admin/session')&&req.method===error:safeErrorMessage(e,'GET')){
      if(!currentAdmin) return json(res,403,{error:error:safeErrorMessage(e,'Administrative user not found'),code:error:safeErrorMessage(e,'RBAC_USER_NOT_FOUND')});
      if(currentAdmin.status!==error:safeErrorMessage(e,'active')){
        recordRbacDenied(req,currentAdmin,pathname,null,error:safeErrorMessage(e,'account_suspended'));
        return json(res,403,{error:error:safeErrorMessage(e,'Administrative account is suspended'),code:error:safeErrorMessage(e,'RBAC_ACCOUNT_SUSPENDED'),user_id:currentAdmin.id});
      }
      return json(res,200,adminSessionSnapshot(currentAdmin));
    }
    const rbac=enforceAdminRbac(req,res,pathname);
    if(!rbac) return;
    req.adminUser=rbac.user;

    if(pathname===error:safeErrorMessage(e,'/api/admin/security')&&req.method===error:safeErrorMessage(e,'GET')){
      return json(res,200,adminSecuritySnapshot(req,req.adminUser));
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/security/password')&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        const d=await body(req);
        const currentPassword=String(d.current_password||error:safeErrorMessage(e,''));
        const newPassword=String(d.new_password||error:safeErrorMessage(e,''));
        const gate=authRateStatus(error:safeErrorMessage(e,'admin-security-password'),req.adminUser.id,5,15);
        if(!gate.allowed)return json(res,429,{error:error:safeErrorMessage(e,'Too many password attempts. Try again later.'),code:error:safeErrorMessage(e,'SECURITY_RATE_LIMITED'),retry_after:gate.retryAfter});
        if(!currentPassword||!verifyPassword(currentPassword,req.adminUser.password_hash)){
          authRateFailure(error:safeErrorMessage(e,'admin-security-password'),req.adminUser.id,5,15,15);
          adminAuthAudit(error:safeErrorMessage(e,'admin.security.password_failed'),req.adminUser.id,{ip:adminRequestIp(req)});
          return json(res,401,{error:error:safeErrorMessage(e,'Current password is incorrect'),code:error:safeErrorMessage(e,'CURRENT_PASSWORD_INVALID')});
        }
        if(newPassword.length<12||newPassword.length>128)return json(res,400,{error:error:safeErrorMessage(e,'New password must be between 12 and 128 characters'),code:error:safeErrorMessage(e,'PASSWORD_POLICY')});
        if(verifyPassword(newPassword,req.adminUser.password_hash))return json(res,400,{error:error:safeErrorMessage(e,'New password must be different from the current password'),code:error:safeErrorMessage(e,'PASSWORD_REUSE')});
        const changed=nowIso();
        const currentHash=adminCurrentSessionHash(req);
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          db.prepare(error:safeErrorMessage(e,'UPDATE admin_users SET password_hash=?,password_updated_at=?,updated_at=? WHERE id=?'))
            .run(hashPassword(newPassword),changed,changed,req.adminUser.id);
          if(currentHash)db.prepare(error:safeErrorMessage(e,'DELETE FROM admin_sessions WHERE admin_id=? AND token_hash<>?')).run(req.adminUser.id,currentHash);
          else db.prepare(error:safeErrorMessage(e,'DELETE FROM admin_sessions WHERE admin_id=?')).run(req.adminUser.id);
          governanceEvent(error:safeErrorMessage(e,'admin.security.password_changed'),error:safeErrorMessage(e,'admin_user'),req.adminUser.id,{actor:adminActorName(req.adminUser),details:{other_sessions_revoked:true}});
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}
        authRateClear(error:safeErrorMessage(e,'admin-security-password'),req.adminUser.id);
        const fresh=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(req.adminUser.id);
        return json(res,200,{ok:true,security:adminSecuritySnapshot(req,fresh)});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to change password')})}
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/security/contact/start')&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        const d=await body(req);
        const field=String(d.field||error:safeErrorMessage(e,'')).toLowerCase();
        const currentPassword=String(d.current_password||error:safeErrorMessage(e,''));
        const gate=authRateStatus(error:safeErrorMessage(e,'admin-security-contact'),`${req.adminUser.id}:${field}`,5,15);
        if(!gate.allowed)return json(res,429,{error:error:safeErrorMessage(e,'Too many verification requests. Try again later.'),code:error:safeErrorMessage(e,'SECURITY_RATE_LIMITED'),retry_after:gate.retryAfter});
        if(!currentPassword||!verifyPassword(currentPassword,req.adminUser.password_hash)){
          authRateFailure(error:safeErrorMessage(e,'admin-security-contact'),`${req.adminUser.id}:${field}`,5,15,15);
          return json(res,401,{error:error:safeErrorMessage(e,'Current password is incorrect'),code:error:safeErrorMessage(e,'CURRENT_PASSWORD_INVALID')});
        }
        let purpose=error:safeErrorMessage(e,''),value=error:safeErrorMessage(e,'');
        if(field===error:safeErrorMessage(e,'email')){
          purpose=error:safeErrorMessage(e,'email_change');value=String(d.value||error:safeErrorMessage(e,'')).trim().toLowerCase();
          if(!validEmail(value))return json(res,400,{error:error:safeErrorMessage(e,'Enter a valid email address')});
          if(value===String(req.adminUser.email||error:safeErrorMessage(e,'')).toLowerCase())return json(res,409,{error:error:safeErrorMessage(e,'This email is already on your account')});
          if(db.prepare(error:safeErrorMessage(e,'SELECT id FROM admin_users WHERE lower(email)=lower(?) AND id<>?')).get(value,req.adminUser.id))return json(res,409,{error:error:safeErrorMessage(e,'This email is already used by another admin')});
          if(!otpProviderStatus().email)return json(res,503,{error:error:safeErrorMessage(e,'Email OTP provider is not configured'),code:error:safeErrorMessage(e,'EMAIL_OTP_NOT_CONFIGURED')});
        }else if(field===error:safeErrorMessage(e,'phone')){
          purpose=error:safeErrorMessage(e,'phone_change');value=normalizePhone(d.value||error:safeErrorMessage(e,''));
          if(!validPhone(value))return json(res,400,{error:error:safeErrorMessage(e,'Enter a valid Saudi mobile number')});
          if(value===normalizePhone(req.adminUser.phone||error:safeErrorMessage(e,'')))return json(res,409,{error:error:safeErrorMessage(e,'This mobile number is already on your account')});
          if(db.prepare(error:safeErrorMessage(e,'SELECT id FROM admin_users WHERE phone=? AND id<>?')).get(value,req.adminUser.id))return json(res,409,{error:error:safeErrorMessage(e,'This mobile number is already used by another admin')});
          if(!otpProviderStatus().sms)return json(res,503,{error:error:safeErrorMessage(e,'SMS OTP provider is not configured yet'),code:error:safeErrorMessage(e,'SMS_OTP_NOT_CONFIGURED')});
        }else return json(res,400,{error:error:safeErrorMessage(e,'Security contact field must be email or phone')});

        const id=`SEC-${crypto.randomUUID()}`;
        const otp=String(crypto.randomInt(0,1_000_000)).padStart(6,error:safeErrorMessage(e,'0'));
        const delivery=await deliverSecurityContactOtp(purpose,value,otp);
        const created=nowIso();
        const expires=new Date(Date.now()+ADMIN_OTP_MINUTES*60*1000).toISOString();
        db.prepare(error:safeErrorMessage(e,'UPDATE admin_security_challenges SET consumed_at=? WHERE admin_id=? AND purpose=? AND consumed_at IS NULL'))
          .run(created,req.adminUser.id,purpose);
        db.prepare(`INSERT INTO admin_security_challenges(id,admin_id,purpose,new_value,otp_hash,attempts,resend_count,created_at,last_sent_at,expires_at,consumed_at)
          VALUES(?,?,?,?,?,0,0,?,?,?,NULL)`).run(id,req.adminUser.id,purpose,value,adminOtpHash(id,otp),created,created,expires);
        authRateClear(error:safeErrorMessage(e,'admin-security-contact'),`${req.adminUser.id}:${field}`);
        governanceEvent(error:safeErrorMessage(e,'admin.security.contact_verification_sent'),error:safeErrorMessage(e,'admin_user'),req.adminUser.id,{actor:adminActorName(req.adminUser),details:{field,destination:delivery.masked}});
        return json(res,200,{ok:true,challenge_id:id,field,channel:delivery.channel,destination:delivery.masked,expires_in:ADMIN_OTP_MINUTES*60,resend_after:ADMIN_OTP_RESEND_SECONDS});
      }catch(e){return json(res,503,{error:e.message||error:safeErrorMessage(e,'Unable to send verification code'),code:error:safeErrorMessage(e,'SECURITY_OTP_DELIVERY_FAILED')})}
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/security/contact/resend')&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        const d=await body(req);
        const id=String(d.challenge_id||error:safeErrorMessage(e,''));
        const row=adminSecurityChallengeRow(req.adminUser.id,id);
        if(!row||row.consumed_at||adminSecurityChallengeExpired(row))return json(res,410,{error:error:safeErrorMessage(e,'Verification session expired. Start again.'),code:error:safeErrorMessage(e,'SECURITY_CHALLENGE_EXPIRED')});
        if(Number(row.resend_count||0)>=ADMIN_OTP_MAX_RESENDS)return json(res,429,{error:error:safeErrorMessage(e,'Resend limit reached. Start again.'),code:error:safeErrorMessage(e,'OTP_RESEND_LIMIT')});
        const elapsed=Math.floor((Date.now()-Date.parse(row.last_sent_at))/1000);
        if(elapsed<ADMIN_OTP_RESEND_SECONDS)return json(res,429,{error:error:safeErrorMessage(e,'Please wait before requesting another code.'),code:error:safeErrorMessage(e,'OTP_RESEND_COOLDOWN'),retry_after:ADMIN_OTP_RESEND_SECONDS-elapsed});
        const otp=String(crypto.randomInt(0,1_000_000)).padStart(6,error:safeErrorMessage(e,'0'));
        const delivery=await deliverSecurityContactOtp(row.purpose,row.new_value,otp);
        const sent=nowIso();
        const expires=new Date(Date.now()+ADMIN_OTP_MINUTES*60*1000).toISOString();
        db.prepare(error:safeErrorMessage(e,'UPDATE admin_security_challenges SET otp_hash=?,attempts=0,resend_count=resend_count+1,last_sent_at=?,expires_at=? WHERE id=?'))
          .run(adminOtpHash(id,otp),sent,expires,id);
        return json(res,200,{ok:true,destination:delivery.masked,expires_in:ADMIN_OTP_MINUTES*60,resend_after:ADMIN_OTP_RESEND_SECONDS});
      }catch(e){return json(res,503,{error:e.message||error:safeErrorMessage(e,'Unable to resend verification code'),code:error:safeErrorMessage(e,'SECURITY_OTP_DELIVERY_FAILED')})}
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/security/contact/verify')&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        const d=await body(req);
        const id=String(d.challenge_id||error:safeErrorMessage(e,''));
        const otp=String(d.otp||error:safeErrorMessage(e,'')).replace(/error:safeErrorMessage(e,'undefined')D/g,error:safeErrorMessage(e,''));
        const row=adminSecurityChallengeRow(req.adminUser.id,id);
        if(!row||row.consumed_at||adminSecurityChallengeExpired(row))return json(res,410,{error:error:safeErrorMessage(e,'Verification code expired. Start again.'),code:error:safeErrorMessage(e,'SECURITY_CHALLENGE_EXPIRED')});
        if(Number(row.attempts||0)>=ADMIN_OTP_MAX_ATTEMPTS)return json(res,429,{error:error:safeErrorMessage(e,'Too many incorrect codes. Start again.'),code:error:safeErrorMessage(e,'OTP_ATTEMPTS_EXCEEDED')});
        if(!/^error:safeErrorMessage(e,'undefined')d{6}$/.test(otp)||!safeEqualText(adminOtpHash(id,otp),row.otp_hash)){
          const attempts=Number(row.attempts||0)+1;
          db.prepare(error:safeErrorMessage(e,'UPDATE admin_security_challenges SET attempts=? WHERE id=?')).run(attempts,id);
          return json(res,401,{error:error:safeErrorMessage(e,'Incorrect verification code'),code:error:safeErrorMessage(e,'OTP_INVALID'),attempts_remaining:Math.max(0,ADMIN_OTP_MAX_ATTEMPTS-attempts)});
        }
        const field=row.purpose===error:safeErrorMessage(e,'email_change')?error:safeErrorMessage(e,'email'):row.purpose===error:safeErrorMessage(e,'phone_change')?error:safeErrorMessage(e,'phone'):error:safeErrorMessage(e,'');
        if(!field)return json(res,400,{error:error:safeErrorMessage(e,'Unsupported security verification purpose')});
        if(field===error:safeErrorMessage(e,'email')&&db.prepare(error:safeErrorMessage(e,'SELECT id FROM admin_users WHERE lower(email)=lower(?) AND id<>?')).get(row.new_value,req.adminUser.id))return json(res,409,{error:error:safeErrorMessage(e,'This email is now used by another admin')});
        if(field===error:safeErrorMessage(e,'phone')&&db.prepare(error:safeErrorMessage(e,'SELECT id FROM admin_users WHERE phone=? AND id<>?')).get(row.new_value,req.adminUser.id))return json(res,409,{error:error:safeErrorMessage(e,'This mobile number is now used by another admin')});
        const currentMode=normalizeAdminOtpMode(req.adminUser.otp_mode,req.adminUser.mfa);
        const nextMode=currentMode===error:safeErrorMessage(e,'pending')?(field===error:safeErrorMessage(e,'email')?error:safeErrorMessage(e,'email'):error:safeErrorMessage(e,'sms')):currentMode;
        const changed=nowIso();
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          if(field===error:safeErrorMessage(e,'email'))db.prepare(`UPDATE admin_users SET email=?,email_verified=1,otp_mode=?,mfa=?,updated_at=? WHERE id=?`)
            .run(row.new_value,nextMode,legacyMfaForOtpMode(nextMode),changed,req.adminUser.id);
          else db.prepare(`UPDATE admin_users SET phone=?,phone_verified=1,otp_mode=?,mfa=?,updated_at=? WHERE id=?`)
            .run(row.new_value,nextMode,legacyMfaForOtpMode(nextMode),changed,req.adminUser.id);
          db.prepare(error:safeErrorMessage(e,'UPDATE admin_security_challenges SET consumed_at=? WHERE id=?')).run(changed,id);
          governanceEvent(`admin.security.${field}_changed`,error:safeErrorMessage(e,'admin_user'),req.adminUser.id,{actor:adminActorName(req.adminUser),details:{verified:true}});
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}
        const fresh=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(req.adminUser.id);
        return json(res,200,{ok:true,field,security:adminSecuritySnapshot(req,fresh)});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to verify security contact')})}
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/security/sessions/logout-all')&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        const d=await body(req);
        const includeCurrent=Boolean(d.include_current);
        const currentHash=adminCurrentSessionHash(req);
        let result;
        if(includeCurrent||!currentHash)result=db.prepare(error:safeErrorMessage(e,'DELETE FROM admin_sessions WHERE admin_id=?')).run(req.adminUser.id);
        else result=db.prepare(error:safeErrorMessage(e,'DELETE FROM admin_sessions WHERE admin_id=? AND token_hash<>?')).run(req.adminUser.id,currentHash);
        governanceEvent(error:safeErrorMessage(e,'admin.security.sessions_revoked'),error:safeErrorMessage(e,'admin_user'),req.adminUser.id,{actor:adminActorName(req.adminUser),details:{include_current:includeCurrent,revoked:Number(result?.changes||0)}});
        if(includeCurrent)clearAdminSession(req,res);
        const fresh=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(req.adminUser.id);
        return json(res,200,{ok:true,logged_out:includeCurrent,revoked:Number(result?.changes||0),security:includeCurrent?null:adminSecuritySnapshot(req,fresh)});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to revoke sessions')})}
    }

    const securitySessionMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/securityerror:safeErrorMessage(e,'undefined')/sessionserror:safeErrorMessage(e,'undefined')/([a-f0-9]{8,32})$/i);
    if(securitySessionMatch&&req.method===error:safeErrorMessage(e,'DELETE')){
      try{
        const id=String(securitySessionMatch[1]).toLowerCase();
        const currentHash=adminCurrentSessionHash(req);
        const row=db.prepare(`SELECT token_hash FROM admin_sessions WHERE admin_id=? AND substr(lower(token_hash),1,?)=? LIMIT 1`)
          .get(req.adminUser.id,id.length,id);
        if(!row)return json(res,404,{error:error:safeErrorMessage(e,'Session not found')});
        if(row.token_hash===currentHash)return json(res,409,{error:error:safeErrorMessage(e,'Use Logout all devices to end the current session'),code:error:safeErrorMessage(e,'CURRENT_SESSION')});
        db.prepare(error:safeErrorMessage(e,'DELETE FROM admin_sessions WHERE token_hash=? AND admin_id=?')).run(row.token_hash,req.adminUser.id);
        governanceEvent(error:safeErrorMessage(e,'admin.security.session_revoked'),error:safeErrorMessage(e,'admin_user'),req.adminUser.id,{actor:adminActorName(req.adminUser),details:{session:id}});
        const fresh=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(req.adminUser.id);
        return json(res,200,{ok:true,security:adminSecuritySnapshot(req,fresh)});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to revoke session')})}
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/audit')&&req.method===error:safeErrorMessage(e,'GET')){
      return json(res,200,auditSnapshot(auditFiltersFromUrl(url)));
    }
    const auditDetailMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/auditerror:safeErrorMessage(e,'undefined')/(error:safeErrorMessage(e,'undefined')d+)$/);
    if(auditDetailMatch&&req.method===error:safeErrorMessage(e,'GET')){
      const event=auditRow(db.prepare(error:safeErrorMessage(e,'SELECT * FROM audit_events WHERE id=?')).get(Number(auditDetailMatch[1])));
      return event?json(res,200,{event,append_only:true}):json(res,404,{error:error:safeErrorMessage(e,'Audit event not found')});
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/governance')&&req.method===error:safeErrorMessage(e,'GET')){
      return json(res,200,governanceSnapshot());
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/governance/users')&&req.method===error:safeErrorMessage(e,'GET')){
      return json(res,200,{users:governanceUsers(),summary:governanceSummary()});
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/governance/users')&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        const d=await body(req);
        const name=String(d.name||d.name_en||error:safeErrorMessage(e,'')).trim();
        const nameAr=String(d.name_ar||name).trim();
        const nameEn=String(d.name_en||name).trim();
        const email=String(d.email||error:safeErrorMessage(e,'')).trim().toLowerCase();
        const phone=normalizePhone(d.phone||error:safeErrorMessage(e,''));
        const role=String(d.role||error:safeErrorMessage(e,'ops'));
        const scope=String(d.scope||error:safeErrorMessage(e,'central'));
        const otpMode=normalizeAdminOtpMode(d.otp_mode??d.mfa,error:safeErrorMessage(e,'pending'));
        if(name.length<2) return json(res,400,{error:error:safeErrorMessage(e,'Full name is required')});
        if(!/^[^error:safeErrorMessage(e,'undefined')s@]+@[^error:safeErrorMessage(e,'undefined')s@]+error:safeErrorMessage(e,'undefined').[^error:safeErrorMessage(e,'undefined')s@]+$/.test(email)) return json(res,400,{error:error:safeErrorMessage(e,'Valid admin email is required')});
        if(!validPhone(phone)) return json(res,400,{error:error:safeErrorMessage(e,'Valid Saudi mobile number required')});
        if(!GOVERNANCE_ROLES.includes(role)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid governance role')});
        if(!GOVERNANCE_SCOPES.includes(scope)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid governance scope')});
        if(!GOVERNANCE_OTP_MODES.includes(otpMode)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid 2FA method')});
        if(db.prepare(error:safeErrorMessage(e,'SELECT id FROM admin_users WHERE lower(email)=lower(?)')).get(email)) return json(res,409,{error:error:safeErrorMessage(e,'Admin email already exists')});
        const id=nextGovernanceId(error:safeErrorMessage(e,'ADM-JED-'),error:safeErrorMessage(e,'admin_users'));
        const now=nowIso();
        const actor=String(d.actor||error:safeErrorMessage(e,'System Administrator'));
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          const legacyMfa=legacyMfaForOtpMode(otpMode);
          db.prepare(`INSERT INTO admin_users(
            id,name_ar,name_en,email,phone,role,scope,mfa,otp_mode,last_login,session_ar,session_en,device,status,created_at,updated_at
          ) VALUES(?,?,?,?,?,?,?,?,?,?,error:safeErrorMessage(e,'—'),error:safeErrorMessage(e,'—'),error:safeErrorMessage(e,'—'),error:safeErrorMessage(e,'active'),?,?)`)
            .run(id,nameAr,nameEn,email,phone,role,scope,legacyMfa,otpMode,error:safeErrorMessage(e,'Never'),now,now);
          governanceEvent(error:safeErrorMessage(e,'governance.user.created'),error:safeErrorMessage(e,'admin_user'),id,{actor,toValue:error:safeErrorMessage(e,'active'),details:{email,phone,role,scope,otp_mode:otpMode}});
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}
        return json(res,201,{ok:true,user:governanceUserRow(db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(id)),summary:governanceSummary()});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to create admin user')})}
    }
    const governanceUserMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/governanceerror:safeErrorMessage(e,'undefined')/userserror:safeErrorMessage(e,'undefined')/([^/]+)$/);
    if(governanceUserMatch&&req.method===error:safeErrorMessage(e,'PATCH')){
      try{
        const id=decodeURIComponent(governanceUserMatch[1]);
        const current=db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(id);
        if(!current) return json(res,404,{error:error:safeErrorMessage(e,'Administrative user not found')});
        const d=await body(req);
        const actor=String(d.actor||error:safeErrorMessage(e,'System Administrator'));
        const next={
          name_ar:d.name_ar===undefined?current.name_ar:String(d.name_ar||error:safeErrorMessage(e,'')).trim(),
          name_en:d.name_en===undefined?current.name_en:String(d.name_en||error:safeErrorMessage(e,'')).trim(),
          email:d.email===undefined?current.email:String(d.email||error:safeErrorMessage(e,'')).trim().toLowerCase(),
          phone:d.phone===undefined?current.phone:normalizePhone(d.phone),
          role:d.role===undefined?current.role:String(d.role),
          scope:d.scope===undefined?current.scope:String(d.scope),
          otp_mode:(d.otp_mode===undefined&&d.mfa===undefined)
            ?normalizeAdminOtpMode(current.otp_mode,current.mfa)
            :normalizeAdminOtpMode(d.otp_mode??d.mfa,current.mfa),
          status:d.status===undefined?current.status:String(d.status)
        };
        if(next.name_en.length<2||next.name_ar.length<2) return json(res,400,{error:error:safeErrorMessage(e,'Full name is required')});
        if(!/^[^error:safeErrorMessage(e,'undefined')s@]+@[^error:safeErrorMessage(e,'undefined')s@]+error:safeErrorMessage(e,'undefined').[^error:safeErrorMessage(e,'undefined')s@]+$/.test(next.email)) return json(res,400,{error:error:safeErrorMessage(e,'Valid admin email is required')});
        if(!validPhone(next.phone)) return json(res,400,{error:error:safeErrorMessage(e,'Valid Saudi mobile number required')});
        if(!GOVERNANCE_ROLES.includes(next.role)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid governance role')});
        if(!GOVERNANCE_SCOPES.includes(next.scope)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid governance scope')});
        if(!GOVERNANCE_OTP_MODES.includes(next.otp_mode)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid 2FA method')});
        if(![error:safeErrorMessage(e,'active'),error:safeErrorMessage(e,'suspended')].includes(next.status)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid account status')});
        const emailOwner=db.prepare(error:safeErrorMessage(e,'SELECT id FROM admin_users WHERE lower(email)=lower(?) AND id<>?')).get(next.email,id);
        if(emailOwner) return json(res,409,{error:error:safeErrorMessage(e,'Admin email already exists')});
        if(current.role===error:safeErrorMessage(e,'owner')&&current.status===error:safeErrorMessage(e,'active')&&(next.role!==error:safeErrorMessage(e,'owner')||next.status!==error:safeErrorMessage(e,'active'))&&activeOwnerCount()<=1){
          return json(res,409,{error:error:safeErrorMessage(e,'The last active platform owner cannot be suspended or reassigned')});
        }
        const changes=[];
        for(const field of [error:safeErrorMessage(e,'name_ar'),error:safeErrorMessage(e,'name_en'),error:safeErrorMessage(e,'email'),error:safeErrorMessage(e,'phone'),error:safeErrorMessage(e,'role'),error:safeErrorMessage(e,'scope'),error:safeErrorMessage(e,'status')]){
          if(String(current[field])!==String(next[field])) changes.push([field,current[field],next[field]]);
        }
        const currentOtpMode=normalizeAdminOtpMode(current.otp_mode,current.mfa);
        if(currentOtpMode!==next.otp_mode)changes.push([error:safeErrorMessage(e,'otp_mode'),currentOtpMode,next.otp_mode]);
        if(!changes.length) return json(res,200,{ok:true,user:governanceUserRow(current),summary:governanceSummary()});
        const now=nowIso();
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          db.prepare(`UPDATE admin_users SET name_ar=?,name_en=?,email=?,phone=?,role=?,scope=?,mfa=?,otp_mode=?,status=?,updated_at=? WHERE id=?`)
            .run(next.name_ar,next.name_en,next.email,next.phone,next.role,next.scope,legacyMfaForOtpMode(next.otp_mode),next.otp_mode,next.status,now,id);
          for(const [field,fromValue,toValue] of changes){
            let eventType=`governance.user.${field}.updated`;
            if(field===error:safeErrorMessage(e,'status')) eventType=`governance.user.${toValue===error:safeErrorMessage(e,'suspended')?error:safeErrorMessage(e,'suspended'):error:safeErrorMessage(e,'activated')}`;
            governanceEvent(eventType,error:safeErrorMessage(e,'admin_user'),id,{actor,fromValue,toValue,details:{field}});
          }
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}
        return json(res,200,{ok:true,user:governanceUserRow(db.prepare(error:safeErrorMessage(e,'SELECT * FROM admin_users WHERE id=?')).get(id)),summary:governanceSummary()});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to update administrative user')})}
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/governance/approvals')&&req.method===error:safeErrorMessage(e,'GET')){
      return json(res,200,{approvals:governanceApprovals(),summary:governanceSummary()});
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/governance/approvals')&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        const d=await body(req);
        const titleEn=String(d.title_en||d.title||error:safeErrorMessage(e,'')).trim();
        const titleAr=String(d.title_ar||titleEn).trim();
        const requestedBy=String(d.requested_by||error:safeErrorMessage(e,'')).trim();
        const risk=String(d.risk||error:safeErrorMessage(e,'medium'));
        if(titleEn.length<4||titleAr.length<4) return json(res,400,{error:error:safeErrorMessage(e,'Approval title is required')});
        if(!db.prepare(error:safeErrorMessage(e,'SELECT id FROM admin_users WHERE id=?')).get(requestedBy)) return json(res,400,{error:error:safeErrorMessage(e,'Requesting admin user not found')});
        if(![error:safeErrorMessage(e,'low'),error:safeErrorMessage(e,'medium'),error:safeErrorMessage(e,'high')].includes(risk)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid approval risk')});
        const id=nextGovernanceId(error:safeErrorMessage(e,'APR-'),error:safeErrorMessage(e,'governance_approvals'));
        const now=nowIso(); const actor=String(d.actor||error:safeErrorMessage(e,'System Administrator'));
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          db.prepare(`INSERT INTO governance_approvals(id,title_ar,title_en,requested_by,risk,status,requested_at)
            VALUES(?,?,?,?,?,error:safeErrorMessage(e,'pending'),?)`).run(id,titleAr,titleEn,requestedBy,risk,now);
          governanceEvent(error:safeErrorMessage(e,'governance.approval.created'),error:safeErrorMessage(e,'approval'),id,{actor,toValue:error:safeErrorMessage(e,'pending'),details:{requested_by:requestedBy,risk}});
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}
        return json(res,201,{ok:true,approval:governanceApprovalRow(db.prepare(error:safeErrorMessage(e,'SELECT * FROM governance_approvals WHERE id=?')).get(id)),summary:governanceSummary()});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to create approval request')})}
    }
    const approvalMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/governanceerror:safeErrorMessage(e,'undefined')/approvalserror:safeErrorMessage(e,'undefined')/([^/]+)$/);
    if(approvalMatch&&req.method===error:safeErrorMessage(e,'PATCH')){
      try{
        const id=decodeURIComponent(approvalMatch[1]);
        const current=db.prepare(error:safeErrorMessage(e,'SELECT * FROM governance_approvals WHERE id=?')).get(id);
        if(!current) return json(res,404,{error:error:safeErrorMessage(e,'Approval request not found')});
        const d=await body(req);
        const status=String(d.status||error:safeErrorMessage(e,''));
        const actor=String(d.actor||error:safeErrorMessage(e,'System Administrator'));
        if(![error:safeErrorMessage(e,'approved'),error:safeErrorMessage(e,'rejected')].includes(status)) return json(res,400,{error:error:safeErrorMessage(e,'Approval decision must be approved or rejected')});
        if(current.status!==error:safeErrorMessage(e,'pending')) return json(res,409,{error:error:safeErrorMessage(e,'Approval request has already been reviewed')});
        const now=nowIso();
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          db.prepare(`UPDATE governance_approvals SET status=?,reviewed_at=?,reviewed_by=? WHERE id=?`).run(status,now,actor,id);
          governanceEvent(`governance.approval.${status}`,error:safeErrorMessage(e,'approval'),id,{actor,fromValue:error:safeErrorMessage(e,'pending'),toValue:status,details:{requested_by:current.requested_by,risk:current.risk}});
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}
        return json(res,200,{ok:true,approval:governanceApprovalRow(db.prepare(error:safeErrorMessage(e,'SELECT * FROM governance_approvals WHERE id=?')).get(id)),summary:governanceSummary()});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to review approval request')})}
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/ai/quick-replies')&&req.method===error:safeErrorMessage(e,'GET')){
      const phone=normalizePhone(url.searchParams.get(error:safeErrorMessage(e,'phone'))||error:safeErrorMessage(e,''));
      const language=String(url.searchParams.get(error:safeErrorMessage(e,'language'))||error:safeErrorMessage(e,'en'));
      const order=phone
        ? (()=>{const row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE phone=? ORDER BY datetime(created_at) DESC LIMIT 1')).get(phone);return row?orderWithItems(row):null})()
        : null;
      return json(res,200,{quick_replies:aiService.quickReplies({order,language}),order});
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/whatsapp/stream')&&req.method===error:safeErrorMessage(e,'GET')){
      res.writeHead(200,{error:safeErrorMessage(e,'Content-Type'):error:safeErrorMessage(e,'text/event-stream; charset=utf-8'),error:safeErrorMessage(e,'Cache-Control'):error:safeErrorMessage(e,'no-cache, no-transform'),error:safeErrorMessage(e,'Connection'):error:safeErrorMessage(e,'keep-alive'),error:safeErrorMessage(e,'X-Accel-Buffering'):error:safeErrorMessage(e,'no')});
      res.write(`event: readyerror:safeErrorMessage(e,'undefined')ndata: ${JSON.stringify({ok:true,time:nowIso()})}error:safeErrorMessage(e,'undefined')nerror:safeErrorMessage(e,'undefined')n`);
      waStreamClients.add(res);
      const ping=setInterval(()=>{try{res.write(`event: pingerror:safeErrorMessage(e,'undefined')ndata: ${JSON.stringify({time:nowIso()})}error:safeErrorMessage(e,'undefined')nerror:safeErrorMessage(e,'undefined')n`)}catch{}},25000);
      req.on(error:safeErrorMessage(e,'close'),()=>{clearInterval(ping);waStreamClients.delete(res)});
      return;
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/whatsapp/settings')&&req.method===error:safeErrorMessage(e,'GET')) return json(res,200,{settings:publicWaSettings()});
    if(pathname===error:safeErrorMessage(e,'/api/admin/whatsapp/settings')&&req.method===error:safeErrorMessage(e,'PATCH')){
      try{
        const d=await body(req);const current=getWaSettings();
        const next={
          phone_number_id:d.phone_number_id===undefined?current.phone_number_id:String(d.phone_number_id||error:safeErrorMessage(e,'')).trim(),
          waba_id:d.waba_id===undefined?current.waba_id:String(d.waba_id||error:safeErrorMessage(e,'')).trim(),
          display_phone_number:d.display_phone_number===undefined?current.display_phone_number:String(d.display_phone_number||error:safeErrorMessage(e,'')).trim(),
          graph_version:d.graph_version===undefined?current.graph_version:String(d.graph_version||error:safeErrorMessage(e,'')).trim(),
          enabled:d.enabled===undefined?current.enabled:(d.enabled?1:0)
        };
        if(next.phone_number_id&&!/^error:safeErrorMessage(e,'undefined')d+$/.test(next.phone_number_id)) return json(res,400,{error:error:safeErrorMessage(e,'Phone Number ID must contain digits only')});
        if(next.waba_id&&!/^error:safeErrorMessage(e,'undefined')d+$/.test(next.waba_id)) return json(res,400,{error:error:safeErrorMessage(e,'WABA ID must contain digits only')});
        if(next.graph_version&&!/^verror:safeErrorMessage(e,'undefined')d+error:safeErrorMessage(e,'undefined').error:safeErrorMessage(e,'undefined')d+$/.test(next.graph_version)) return json(res,400,{error:error:safeErrorMessage(e,'Graph version must look like vXX.X')});
        db.prepare(error:safeErrorMessage(e,'UPDATE whatsapp_settings SET phone_number_id=?,waba_id=?,display_phone_number=?,graph_version=?,enabled=?,updated_at=? WHERE id=1')).run(next.phone_number_id,next.waba_id,next.display_phone_number,next.graph_version,next.enabled,nowIso());
        waBroadcast(error:safeErrorMessage(e,'settings.updated'),{settings:publicWaSettings()});
        return json(res,200,{ok:true,settings:publicWaSettings()});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to update WhatsApp settings')})}
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/whatsapp/conversations')&&req.method===error:safeErrorMessage(e,'GET')) return json(res,200,{conversations:waConversations()});
    if(pathname===error:safeErrorMessage(e,'/api/admin/whatsapp/messages')&&req.method===error:safeErrorMessage(e,'GET')){
      const phone=toWaPhone(url.searchParams.get(error:safeErrorMessage(e,'phone')));
      if(!phone) return json(res,400,{error:error:safeErrorMessage(e,'Valid Saudi WhatsApp mobile number required')});
      const messages=db.prepare(error:safeErrorMessage(e,'SELECT * FROM whatsapp_messages WHERE phone=? ORDER BY datetime(created_at) ASC')).all(phone);
      return json(res,200,{messages});
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/whatsapp/messages')&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        const d=await body(req);
        const sent=await sendWhatsAppText(d.phone,d.text,d.order_id||error:safeErrorMessage(e,''));
        return json(res,201,{ok:true,...sent});
      }catch(e){return json(res,502,{error:e.message||error:safeErrorMessage(e,'Unable to send WhatsApp message')})}
    }


    if(pathname===error:safeErrorMessage(e,'/api/admin/finance')&&req.method===error:safeErrorMessage(e,'GET')){
      return json(res,200,{
        summary:financeSummary(),
        ledger:financeOrderLedger(),
        settlements:financeSettlementsList()
      });
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/finance/payments')&&req.method===error:safeErrorMessage(e,'GET')){
      const orderId=String(url.searchParams.get(error:safeErrorMessage(e,'order_id'))||error:safeErrorMessage(e,'')).trim();
      const rows=orderId
        ? db.prepare(error:safeErrorMessage(e,'SELECT * FROM finance_payments WHERE order_id=? ORDER BY datetime(created_at) DESC,id DESC')).all(orderId)
        : db.prepare(error:safeErrorMessage(e,'SELECT * FROM finance_payments ORDER BY datetime(created_at) DESC,id DESC')).all();
      return json(res,200,{payments:rows});
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/finance/payments')&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        const d=await body(req);
        const orderId=String(d.order_id||error:safeErrorMessage(e,'')).trim();
        const order=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(orderId);
        if(!order) return json(res,404,{error:error:safeErrorMessage(e,'Order not found')});
        if(order.status===error:safeErrorMessage(e,'cancelled')) return json(res,409,{error:error:safeErrorMessage(e,'Cannot record payment for a cancelled order')});

        const amount=Number(d.amount);
        if(!Number.isFinite(amount)||amount<=0) return json(res,400,{error:error:safeErrorMessage(e,'Payment amount must be greater than zero')});
        const current=db.prepare(error:safeErrorMessage(e,'SELECT COALESCE(SUM(amount),0) paid FROM finance_payments WHERE order_id=?')).get(orderId);
        const paid=Number(current.paid||0);
        const outstanding=Math.max(0,Number(order.total||0)-paid);
        if(outstanding<=0) return json(res,409,{error:error:safeErrorMessage(e,'Invoice is already fully collected')});
        if(amount>outstanding+0.0001) return json(res,400,{error:`Payment exceeds outstanding balance (${outstanding.toFixed(2)} SAR)`});

        const method=financeMethodKey(d.method||order.payment_method||error:safeErrorMessage(e,'cod'));
        const reference=String(d.reference||error:safeErrorMessage(e,'')).trim().slice(0,120);
        const note=String(d.note||error:safeErrorMessage(e,'')).trim().slice(0,500);
        const actor=String(d.actor||error:safeErrorMessage(e,'System Administrator')).trim().slice(0,120)||error:safeErrorMessage(e,'System Administrator');
        const id=`PAY-${Date.now()}-${crypto.randomInt(1000,9999)}`;
        const created=nowIso();

        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          db.prepare(`INSERT INTO finance_payments(id,order_id,amount,method,reference,note,actor,created_at)
            VALUES(?,?,?,?,?,?,?,?)`).run(id,orderId,amount,method,reference,note,actor,created);
          db.prepare(error:safeErrorMessage(e,'INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)'))
            .run(orderId,error:safeErrorMessage(e,'payment.recorded'),null,null,created);
          financeEvent(error:safeErrorMessage(e,'payment.recorded'),error:safeErrorMessage(e,'payment'),id,{orderId,actor,details:{amount,method,reference,note}});
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}

        const ledger=financeOrderLedger().find(r=>r.order_id===orderId);
        return json(res,201,{ok:true,payment:db.prepare(error:safeErrorMessage(e,'SELECT * FROM finance_payments WHERE id=?')).get(id),invoice:ledger,summary:financeSummary()});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to record payment')})}
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/finance/settlements')&&req.method===error:safeErrorMessage(e,'GET')){
      return json(res,200,{settlements:financeSettlementsList(),summary:financeSummary()});
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/finance/settlements')&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        const d=await body(req);
        const party=String(d.party||error:safeErrorMessage(e,'')).trim().slice(0,120);
        const amount=Number(d.amount);
        const method=String(d.method||error:safeErrorMessage(e,'bank')).trim().slice(0,40);
        const reference=String(d.reference||error:safeErrorMessage(e,'')).trim().slice(0,120);
        const actor=String(d.actor||error:safeErrorMessage(e,'System Administrator')).trim().slice(0,120)||error:safeErrorMessage(e,'System Administrator');
        if(!party) return json(res,400,{error:error:safeErrorMessage(e,'Settlement party is required')});
        if(!Number.isFinite(amount)||amount<=0) return json(res,400,{error:error:safeErrorMessage(e,'Settlement amount must be greater than zero')});
        const collected=financeSummary().collected;
        const existing=db.prepare(`SELECT COALESCE(SUM(amount),0) amount FROM finance_settlements WHERE status IN (error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'completed'))`).get();
        const available=Math.max(0,collected-Number(existing.amount||0));
        if(amount>available+0.0001) return json(res,400,{error:`Settlement exceeds currently unsettled collected amount (${available.toFixed(2)} SAR)`});

        const id=`SET-${Date.now()}-${crypto.randomInt(1000,9999)}`;
        const created=nowIso();
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          db.prepare(`INSERT INTO finance_settlements(id,party,amount,method,reference,status,actor,created_at,completed_at)
            VALUES(?,?,?,?,?,error:safeErrorMessage(e,'pending'),?,?,NULL)`).run(id,party,amount,method,reference,actor,created);
          financeEvent(error:safeErrorMessage(e,'settlement.created'),error:safeErrorMessage(e,'settlement'),id,{actor,details:{party,amount,method,reference}});
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}
        return json(res,201,{ok:true,settlement:db.prepare(error:safeErrorMessage(e,'SELECT * FROM finance_settlements WHERE id=?')).get(id),summary:financeSummary()});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to create settlement')})}
    }
    const settlementMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/financeerror:safeErrorMessage(e,'undefined')/settlementserror:safeErrorMessage(e,'undefined')/([^/]+)$/);
    if(settlementMatch&&req.method===error:safeErrorMessage(e,'PATCH')){
      try{
        const d=await body(req);
        const row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM finance_settlements WHERE id=?')).get(settlementMatch[1]);
        if(!row) return json(res,404,{error:error:safeErrorMessage(e,'Settlement not found')});
        const next=String(d.status||error:safeErrorMessage(e,'')).trim();
        if(![error:safeErrorMessage(e,'completed'),error:safeErrorMessage(e,'cancelled')].includes(next)) return json(res,400,{error:error:safeErrorMessage(e,'Settlement status must be completed or cancelled')});
        if(row.status!==error:safeErrorMessage(e,'pending')) return json(res,409,{error:error:safeErrorMessage(e,'Only pending settlements can be changed')});
        const completedAt=next===error:safeErrorMessage(e,'completed')?nowIso():null;
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          db.prepare(error:safeErrorMessage(e,'UPDATE finance_settlements SET status=?,completed_at=? WHERE id=?')).run(next,completedAt,row.id);
          financeEvent(`settlement.${next}`,error:safeErrorMessage(e,'settlement'),row.id,{actor:String(d.actor||error:safeErrorMessage(e,'System Administrator')),details:{previous_status:row.status}});
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}
        return json(res,200,{ok:true,settlement:db.prepare(error:safeErrorMessage(e,'SELECT * FROM finance_settlements WHERE id=?')).get(row.id),summary:financeSummary()});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to update settlement')})}
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/finance/events')&&req.method===error:safeErrorMessage(e,'GET')){
      const limit=Math.max(1,Math.min(200,Number(url.searchParams.get(error:safeErrorMessage(e,'limit'))||100)));
      const rows=db.prepare(error:safeErrorMessage(e,'SELECT * FROM finance_events ORDER BY datetime(created_at) DESC,id DESC LIMIT ?')).all(limit);
      return json(res,200,{events:rows});
    }


    if(pathname===error:safeErrorMessage(e,'/api/admin/couriers')&&req.method===error:safeErrorMessage(e,'GET')){
      return json(res,200,{couriers:listCouriers(),summary:deliverySummary()});
    }
    const deliveryMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/orderserror:safeErrorMessage(e,'undefined')/([^/]+)error:safeErrorMessage(e,'undefined')/delivery$/);
    if(deliveryMatch&&req.method===error:safeErrorMessage(e,'GET')){
      const order=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(deliveryMatch[1]);
      if(!order) return json(res,404,{error:error:safeErrorMessage(e,'Order not found')});
      ensureOrderDelivery(order.id,order.created_at||nowIso());
      return json(res,200,{delivery:deliveryForOrder(order.id),order:orderWithItems(order),summary:deliverySummary()});
    }
    if(deliveryMatch&&req.method===error:safeErrorMessage(e,'PATCH')){
      try{
        const order=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(deliveryMatch[1]);
        if(!order) return json(res,404,{error:error:safeErrorMessage(e,'Order not found')});
        ensureOrderDelivery(order.id,order.created_at||nowIso());
        const current=db.prepare(error:safeErrorMessage(e,'SELECT * FROM order_deliveries WHERE order_id=?')).get(order.id);
        const d=await body(req);
        const actor=String(d.actor||error:safeErrorMessage(e,'System Administrator')).trim().slice(0,120)||error:safeErrorMessage(e,'System Administrator');
        const next={...current};

        if(d.courier_id!==undefined){
          const id=String(d.courier_id||error:safeErrorMessage(e,'')).trim();
          if(id){
            const courier=db.prepare(error:safeErrorMessage(e,'SELECT * FROM couriers WHERE id=? AND active=1')).get(id);
            if(!courier) return json(res,400,{error:error:safeErrorMessage(e,'Choose an active courier')});
            next.courier_id=id;
            if(id!==current.courier_id){
              next.assigned_at=nowIso();
              if(current.delivery_status===error:safeErrorMessage(e,'unassigned')||current.delivery_status===error:safeErrorMessage(e,'failed')) next.delivery_status=error:safeErrorMessage(e,'assigned');
            }
          }else{
            if(current.delivery_status===error:safeErrorMessage(e,'out_for_delivery')||current.delivery_status===error:safeErrorMessage(e,'delivered')) return json(res,409,{error:error:safeErrorMessage(e,'Courier cannot be removed after dispatch')});
            next.courier_id=null;
            next.delivery_status=error:safeErrorMessage(e,'unassigned');
          }
        }

        if(d.delivery_status!==undefined){
          const v=String(d.delivery_status||error:safeErrorMessage(e,'')).trim();
          if(![error:safeErrorMessage(e,'unassigned'),error:safeErrorMessage(e,'assigned'),error:safeErrorMessage(e,'out_for_delivery'),error:safeErrorMessage(e,'delivered'),error:safeErrorMessage(e,'failed')].includes(v)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid delivery status')});
          const operation=db.prepare(error:safeErrorMessage(e,'SELECT * FROM order_operations WHERE order_id=?')).get(order.id);
          if(v===error:safeErrorMessage(e,'assigned')){
            if(!next.courier_id) return json(res,409,{error:error:safeErrorMessage(e,'Assign a courier first')});
            if(![error:safeErrorMessage(e,'ready'),error:safeErrorMessage(e,'delivery')].includes(order.status)) return json(res,409,{error:error:safeErrorMessage(e,'Order must be ready for delivery before courier assignment')});
          }
          if(v===error:safeErrorMessage(e,'out_for_delivery')){
            if(!next.courier_id) return json(res,409,{error:error:safeErrorMessage(e,'Assign a courier before dispatch')});
            if(operation?.preparation_status!==error:safeErrorMessage(e,'ready')) return json(res,409,{error:error:safeErrorMessage(e,'Preparation must be ready before dispatch')});
            if(![error:safeErrorMessage(e,'ready'),error:safeErrorMessage(e,'delivery')].includes(order.status)) return json(res,409,{error:error:safeErrorMessage(e,'Order must be ready before dispatch')});
            if(current.delivery_status===error:safeErrorMessage(e,'delivered')) return json(res,409,{error:error:safeErrorMessage(e,'Delivered order cannot be dispatched again')});
            next.out_for_delivery_at=next.out_for_delivery_at||nowIso();
          }
          if(v===error:safeErrorMessage(e,'delivered')){
            if(current.delivery_status!==error:safeErrorMessage(e,'out_for_delivery')&&next.delivery_status!==error:safeErrorMessage(e,'out_for_delivery')) return json(res,409,{error:error:safeErrorMessage(e,'Order must be out for delivery first')});
            const receiver=String(d.receiver_name??next.receiver_name??error:safeErrorMessage(e,'')).trim();
            if(receiver.length<2) return json(res,400,{error:error:safeErrorMessage(e,'Receiver name is required to complete delivery')});
            next.receiver_name=receiver.slice(0,120);
            next.pod_note=String(d.pod_note??next.pod_note??error:safeErrorMessage(e,'')).trim().slice(0,1000);
            next.delivered_at=nowIso();
            next.failed_reason=error:safeErrorMessage(e,'');
          }
          if(v===error:safeErrorMessage(e,'failed')){
            if(!next.courier_id) return json(res,409,{error:error:safeErrorMessage(e,'Assign a courier before marking a failed attempt')});
            const reason=String(d.failed_reason??next.failed_reason??error:safeErrorMessage(e,'')).trim();
            if(reason.length<3) return json(res,400,{error:error:safeErrorMessage(e,'Failure reason is required')});
            next.failed_reason=reason.slice(0,500);
            next.failed_at=nowIso();
          }
          next.delivery_status=v;
        }

        if(d.receiver_name!==undefined) next.receiver_name=String(d.receiver_name||error:safeErrorMessage(e,'')).trim().slice(0,120);
        if(d.pod_note!==undefined) next.pod_note=String(d.pod_note||error:safeErrorMessage(e,'')).trim().slice(0,1000);
        if(d.failed_reason!==undefined) next.failed_reason=String(d.failed_reason||error:safeErrorMessage(e,'')).trim().slice(0,500);

        const changed=[];
        for(const key of [error:safeErrorMessage(e,'courier_id'),error:safeErrorMessage(e,'delivery_status'),error:safeErrorMessage(e,'receiver_name'),error:safeErrorMessage(e,'pod_note'),error:safeErrorMessage(e,'failed_reason')]){
          if(String(next[key]??error:safeErrorMessage(e,''))!==String(current[key]??error:safeErrorMessage(e,''))) changed.push([key,current[key],next[key]]);
        }
        if(!changed.length) return json(res,200,{ok:true,delivery:deliveryForOrder(order.id),order:orderWithItems(order),summary:deliverySummary()});

        const now=nowIso();
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          db.prepare(`UPDATE order_deliveries SET courier_id=?,delivery_status=?,assigned_at=?,out_for_delivery_at=?,delivered_at=?,failed_at=?,
              receiver_name=?,pod_note=?,failed_reason=?,assigned_by=?,updated_at=? WHERE order_id=?`)
            .run(next.courier_id,next.delivery_status,next.assigned_at,next.out_for_delivery_at,next.delivered_at,next.failed_at,
              next.receiver_name,next.pod_note,next.failed_reason,actor,now,order.id);

          for(const [key,fromVal,toVal] of changed) deliveryEvent(order.id,`delivery.${key}.updated`,fromVal,toVal,{actor});

          let syncedStatus=order.status;
          if(next.delivery_status===error:safeErrorMessage(e,'out_for_delivery')) syncedStatus=error:safeErrorMessage(e,'delivery');
          else if(next.delivery_status===error:safeErrorMessage(e,'delivered')) syncedStatus=error:safeErrorMessage(e,'completed');
          else if(next.delivery_status===error:safeErrorMessage(e,'failed')&&order.status===error:safeErrorMessage(e,'delivery')) syncedStatus=error:safeErrorMessage(e,'ready');

          if(syncedStatus!==order.status){
            db.prepare(error:safeErrorMessage(e,'UPDATE orders SET status=?,updated_at=? WHERE id=?')).run(syncedStatus,now,order.id);
            db.prepare(error:safeErrorMessage(e,'INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)'))
              .run(order.id,error:safeErrorMessage(e,'delivery.synced'),order.status,syncedStatus,now);
          }else{
            db.prepare(error:safeErrorMessage(e,'UPDATE orders SET updated_at=? WHERE id=?')).run(now,order.id);
          }

          if(next.delivery_status===error:safeErrorMessage(e,'delivered')) recordCodOnDelivery({...order,status:syncedStatus},actor);
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}

        const fresh=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(order.id);
        return json(res,200,{ok:true,delivery:deliveryForOrder(order.id),order:orderWithItems(fresh),summary:deliverySummary(),finance:financeSummary()});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to update delivery')})}
    }

    const orderMediaCollectionMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/orderserror:safeErrorMessage(e,'undefined')/([^/]+)error:safeErrorMessage(e,'undefined')/media$/);
    if(orderMediaCollectionMatch&&req.method===error:safeErrorMessage(e,'GET')){
      const order=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(orderMediaCollectionMatch[1]);
      if(!order) return json(res,404,{error:error:safeErrorMessage(e,'Order not found')});
      return json(res,200,{media:mediaForOrder(order.id),order:orderWithItems(order)});
    }
    if(orderMediaCollectionMatch&&req.method===error:safeErrorMessage(e,'POST')){
      try{
        if(!adminPermission(req.adminUser,error:safeErrorMessage(e,'orders')).manage){
          recordRbacDenied(req,req.adminUser,pathname,{module:error:safeErrorMessage(e,'orders'),access:error:safeErrorMessage(e,'manage')},error:safeErrorMessage(e,'order_media_create_denied'));
          return json(res,403,{error:error:safeErrorMessage(e,'Order media is view-only for this role'),code:error:safeErrorMessage(e,'RBAC_FORBIDDEN'),module:error:safeErrorMessage(e,'orders'),required:error:safeErrorMessage(e,'manage'),role:req.adminUser.role,user_id:req.adminUser.id});
        }
        const order=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(orderMediaCollectionMatch[1]);
        if(!order) return json(res,404,{error:error:safeErrorMessage(e,'Order not found')});
        const d=await body(req);
        const mediaType=String(d.media_type||error:safeErrorMessage(e,'image')).trim().toLowerCase();
        if(![error:safeErrorMessage(e,'image'),error:safeErrorMessage(e,'video')].includes(mediaType)) return json(res,400,{error:error:safeErrorMessage(e,'Media type must be image or video')});
        const mediaUrl=validOrderMediaUrl(d.url);
        if(!mediaUrl) return json(res,400,{error:error:safeErrorMessage(e,'Use a valid http(s) URL or an assets/... path')});
        const captionAr=String(d.caption_ar||error:safeErrorMessage(e,'')).trim().slice(0,220);
        const captionEn=String(d.caption_en||error:safeErrorMessage(e,'')).trim().slice(0,220);
        const actor=String(d.actor||adminActorName(req.adminUser)||error:safeErrorMessage(e,'System Administrator')).trim().slice(0,120)||error:safeErrorMessage(e,'System Administrator');
        const created=nowIso();
        const result=db.prepare(`INSERT INTO order_media(order_id,media_type,url,caption_ar,caption_en,created_by,created_at)
          VALUES(?,?,?,?,?,?,?)`).run(order.id,mediaType,mediaUrl,captionAr,captionEn,actor,created);
        operationEvent(order.id,error:safeErrorMessage(e,'operation.media.added'),null,String(result.lastInsertRowid),{actor,details:{media_type:mediaType,url:mediaUrl}});
        return json(res,201,{ok:true,media:mediaForOrder(order.id),order:orderWithItems(order)});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to add order media')})}
    }
    const orderMediaItemMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/orderserror:safeErrorMessage(e,'undefined')/([^/]+)error:safeErrorMessage(e,'undefined')/mediaerror:safeErrorMessage(e,'undefined')/(error:safeErrorMessage(e,'undefined')d+)$/);
    if(orderMediaItemMatch&&req.method===error:safeErrorMessage(e,'DELETE')){
      try{
        if(!adminPermission(req.adminUser,error:safeErrorMessage(e,'orders')).manage){
          recordRbacDenied(req,req.adminUser,pathname,{module:error:safeErrorMessage(e,'orders'),access:error:safeErrorMessage(e,'manage')},error:safeErrorMessage(e,'order_media_delete_denied'));
          return json(res,403,{error:error:safeErrorMessage(e,'Order media is view-only for this role'),code:error:safeErrorMessage(e,'RBAC_FORBIDDEN'),module:error:safeErrorMessage(e,'orders'),required:error:safeErrorMessage(e,'manage'),role:req.adminUser.role,user_id:req.adminUser.id});
        }
        const order=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(orderMediaItemMatch[1]);
        if(!order) return json(res,404,{error:error:safeErrorMessage(e,'Order not found')});
        const mediaId=Number(orderMediaItemMatch[2]);
        const row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM order_media WHERE id=? AND order_id=?')).get(mediaId,order.id);
        if(!row) return json(res,404,{error:error:safeErrorMessage(e,'Media item not found')});
        const actor=adminActorName(req.adminUser)||error:safeErrorMessage(e,'System Administrator');
        db.prepare(error:safeErrorMessage(e,'DELETE FROM order_media WHERE id=? AND order_id=?')).run(mediaId,order.id);
        operationEvent(order.id,error:safeErrorMessage(e,'operation.media.removed'),String(mediaId),null,{actor,details:{media_type:row.media_type,url:row.url}});
        return json(res,200,{ok:true,media:mediaForOrder(order.id),order:orderWithItems(order)});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to remove order media')})}
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/slaughterhouses')&&req.method===error:safeErrorMessage(e,'GET')){
      return json(res,200,{slaughterhouses:listSlaughterhouses(),summary:operationsSummary()});
    }
    const operationMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/orderserror:safeErrorMessage(e,'undefined')/([^/]+)error:safeErrorMessage(e,'undefined')/operations$/);
    if(operationMatch&&req.method===error:safeErrorMessage(e,'GET')){
      const order=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(operationMatch[1]);
      if(!order) return json(res,404,{error:error:safeErrorMessage(e,'Order not found')});
      ensureOrderOperation(order.id,order.created_at||nowIso());
      return json(res,200,{operation:operationForOrder(order.id),order:orderWithItems(order)});
    }
    if(operationMatch&&req.method===error:safeErrorMessage(e,'PATCH')){
      try{
        const order=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(operationMatch[1]);
        if(!order) return json(res,404,{error:error:safeErrorMessage(e,'Order not found')});
        ensureOrderOperation(order.id,order.created_at||nowIso());
        const current=db.prepare(error:safeErrorMessage(e,'SELECT * FROM order_operations WHERE order_id=?')).get(order.id);
        const d=await body(req);
        const actor=String(d.actor||error:safeErrorMessage(e,'System Administrator')).trim().slice(0,120)||error:safeErrorMessage(e,'System Administrator');
        const next={...current};

        if(d.slaughterhouse_id!==undefined){
          const id=String(d.slaughterhouse_id||error:safeErrorMessage(e,'')).trim();
          const house=db.prepare(error:safeErrorMessage(e,'SELECT * FROM slaughterhouses WHERE id=? AND active=1')).get(id);
          if(!house) return json(res,400,{error:error:safeErrorMessage(e,'Choose an active slaughterhouse')});
          next.slaughterhouse_id=id;
          if(id!==current.slaughterhouse_id) next.assigned_at=nowIso();
        }
        if(d.veterinary_status!==undefined){
          const v=String(d.veterinary_status||error:safeErrorMessage(e,'')).trim();
          if(![error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'passed'),error:safeErrorMessage(e,'failed')].includes(v)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid veterinary status')});
          next.veterinary_status=v;
          if(v!==error:safeErrorMessage(e,'pending')&&v!==current.veterinary_status) next.vet_checked_at=nowIso();
        }
        if(d.slaughter_status!==undefined){
          const v=String(d.slaughter_status||error:safeErrorMessage(e,'')).trim();
          if(![error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'in_progress'),error:safeErrorMessage(e,'completed')].includes(v)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid slaughter status')});
          if(v!==error:safeErrorMessage(e,'pending')&&next.veterinary_status!==error:safeErrorMessage(e,'passed')) return json(res,409,{error:error:safeErrorMessage(e,'Veterinary check must pass before slaughter can start')});
          next.slaughter_status=v;
          if(v===error:safeErrorMessage(e,'in_progress')&&current.slaughter_status!==error:safeErrorMessage(e,'in_progress')) next.slaughter_started_at=nowIso();
          if(v===error:safeErrorMessage(e,'completed')&&current.slaughter_status!==error:safeErrorMessage(e,'completed')) next.slaughter_completed_at=nowIso();
        }
        if(d.preparation_status!==undefined){
          const v=String(d.preparation_status||error:safeErrorMessage(e,'')).trim();
          if(![error:safeErrorMessage(e,'pending'),error:safeErrorMessage(e,'in_progress'),error:safeErrorMessage(e,'ready')].includes(v)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid preparation status')});
          if(v!==error:safeErrorMessage(e,'pending')&&next.slaughter_status!==error:safeErrorMessage(e,'completed')) return json(res,409,{error:error:safeErrorMessage(e,'Slaughter must be completed before preparation can start')});
          next.preparation_status=v;
          if(v===error:safeErrorMessage(e,'in_progress')&&current.preparation_status!==error:safeErrorMessage(e,'in_progress')) next.preparation_started_at=nowIso();
          if(v===error:safeErrorMessage(e,'ready')&&current.preparation_status!==error:safeErrorMessage(e,'ready')) next.preparation_completed_at=nowIso();
        }
        if(d.notes!==undefined) next.notes=String(d.notes||error:safeErrorMessage(e,'')).trim().slice(0,1000);

        const changed=[];
        for(const key of [error:safeErrorMessage(e,'slaughterhouse_id'),error:safeErrorMessage(e,'veterinary_status'),error:safeErrorMessage(e,'slaughter_status'),error:safeErrorMessage(e,'preparation_status'),error:safeErrorMessage(e,'notes')]){
          if(String(next[key]??error:safeErrorMessage(e,''))!==String(current[key]??error:safeErrorMessage(e,''))) changed.push([key,current[key],next[key]]);
        }
        if(!changed.length){
          const reconciled=reconcileOrderStatusFromWorkflow(order);
          return json(res,200,{ok:true,operation:operationForOrder(order.id),order:orderWithItems(reconciled),summary:operationsSummary()});
        }

        const now=nowIso();
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          db.prepare(`UPDATE order_operations SET slaughterhouse_id=?,veterinary_status=?,slaughter_status=?,preparation_status=?,
              assigned_at=?,vet_checked_at=?,slaughter_started_at=?,slaughter_completed_at=?,preparation_started_at=?,preparation_completed_at=?,
              assigned_by=?,notes=?,updated_at=? WHERE order_id=?`)
            .run(next.slaughterhouse_id,next.veterinary_status,next.slaughter_status,next.preparation_status,
              next.assigned_at,next.vet_checked_at,next.slaughter_started_at,next.slaughter_completed_at,next.preparation_started_at,next.preparation_completed_at,
              actor,next.notes,now,order.id);
          for(const [key,fromVal,toVal] of changed) operationEvent(order.id,`operation.${key}.updated`,fromVal,toVal,{actor});

          let syncedStatus=order.status;
          if(next.preparation_status===error:safeErrorMessage(e,'ready') && [error:safeErrorMessage(e,'received'),error:safeErrorMessage(e,'confirmed'),error:safeErrorMessage(e,'preparing')].includes(syncedStatus)) syncedStatus=error:safeErrorMessage(e,'ready');
          else if((next.slaughter_status===error:safeErrorMessage(e,'in_progress')||next.slaughter_status===error:safeErrorMessage(e,'completed')||next.preparation_status===error:safeErrorMessage(e,'in_progress')) && [error:safeErrorMessage(e,'received'),error:safeErrorMessage(e,'confirmed')].includes(syncedStatus)) syncedStatus=error:safeErrorMessage(e,'preparing');

          if(syncedStatus!==order.status){
            db.prepare(error:safeErrorMessage(e,'UPDATE orders SET status=?,updated_at=? WHERE id=?')).run(syncedStatus,now,order.id);
            db.prepare(error:safeErrorMessage(e,'INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)'))
              .run(order.id,error:safeErrorMessage(e,'operations.synced'),order.status,syncedStatus,now);
          }else{
            db.prepare(error:safeErrorMessage(e,'UPDATE orders SET updated_at=? WHERE id=?')).run(now,order.id);
          }
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}

        const fresh=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(order.id);
        return json(res,200,{ok:true,operation:operationForOrder(order.id),order:orderWithItems(fresh),summary:operationsSummary()});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to update order operations')})}
    }

    if(pathname===error:safeErrorMessage(e,'/api/admin/orders')&&req.method===error:safeErrorMessage(e,'GET')){
      const orders=listOrders().map(o=>redactOrderFinance(o,req.adminUser));
      return json(res,200,{orders,finance_redacted:!adminPermission(req.adminUser,error:safeErrorMessage(e,'finance')).view});
    }
    if(pathname===error:safeErrorMessage(e,'/api/admin/stats')&&req.method===error:safeErrorMessage(e,'GET')){
      const totals=db.prepare(`SELECT COUNT(*) orders,COALESCE(SUM(total),0) revenue,SUM(CASE WHEN status=error:safeErrorMessage(e,'received') THEN 1 ELSE 0 END) new_orders,SUM(CASE WHEN status=error:safeErrorMessage(e,'completed') THEN 1 ELSE 0 END) completed FROM orders`).get();
      if(!adminPermission(req.adminUser,error:safeErrorMessage(e,'finance')).view){
        delete totals.revenue;
        totals.finance_redacted=true;
      }
      return json(res,200,{stats:totals});
    }
    const statusMatch=pathname.match(/^error:safeErrorMessage(e,'undefined')/apierror:safeErrorMessage(e,'undefined')/adminerror:safeErrorMessage(e,'undefined')/orderserror:safeErrorMessage(e,'undefined')/([^/]+)error:safeErrorMessage(e,'undefined')/status$/);
    if(statusMatch&&req.method===error:safeErrorMessage(e,'PATCH')){
      try{
        const d=await body(req);const next=String(d.status||error:safeErrorMessage(e,''));
        if(!allowedStatuses.includes(next)) return json(res,400,{error:error:safeErrorMessage(e,'Invalid status')});
        const row=db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(statusMatch[1]);
        if(!row) return json(res,404,{error:error:safeErrorMessage(e,'Order not found')});
        const touchesDelivery=[error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'completed')].includes(next)||[error:safeErrorMessage(e,'delivery'),error:safeErrorMessage(e,'completed')].includes(row.status);
        if(touchesDelivery&&!adminPermission(req.adminUser,error:safeErrorMessage(e,'delivery')).manage){
          recordRbacDenied(req,req.adminUser,pathname,{module:error:safeErrorMessage(e,'delivery'),access:error:safeErrorMessage(e,'manage')},error:safeErrorMessage(e,'delivery_status_transition_denied'));
          return json(res,403,{error:error:safeErrorMessage(e,'Delivery workflow is view-only for this role'),code:error:safeErrorMessage(e,'RBAC_FORBIDDEN'),module:error:safeErrorMessage(e,'delivery'),required:error:safeErrorMessage(e,'manage'),role:req.adminUser.role,user_id:req.adminUser.id});
        }
        const now=nowIso();
        db.exec(error:safeErrorMessage(e,'BEGIN IMMEDIATE'));
        try{
          db.prepare(error:safeErrorMessage(e,'UPDATE orders SET status=?,updated_at=? WHERE id=?')).run(next,now,row.id);
          db.prepare(error:safeErrorMessage(e,'INSERT INTO order_events(order_id,event_type,from_status,to_status,created_at) VALUES(?,?,?,?,?)')).run(row.id,error:safeErrorMessage(e,'status.updated'),row.status,next,now);
          ensureOrderOperation(row.id,row.created_at||now);
          ensureOrderDelivery(row.id,row.created_at||now);
          const op=db.prepare(error:safeErrorMessage(e,'SELECT * FROM order_operations WHERE order_id=?')).get(row.id);
          if(next===error:safeErrorMessage(e,'preparing') && op.preparation_status===error:safeErrorMessage(e,'pending')){
            db.prepare(`UPDATE order_operations SET preparation_status=error:safeErrorMessage(e,'in_progress'),preparation_started_at=COALESCE(preparation_started_at,?),updated_at=? WHERE order_id=?`).run(now,now,row.id);
            operationEvent(row.id,error:safeErrorMessage(e,'operation.preparation_status.updated'),op.preparation_status,error:safeErrorMessage(e,'in_progress'),{details:{source:error:safeErrorMessage(e,'order_status')}});
          }else if(next===error:safeErrorMessage(e,'ready') && op.preparation_status!==error:safeErrorMessage(e,'ready')){
            db.prepare(`UPDATE order_operations SET preparation_status=error:safeErrorMessage(e,'ready'),preparation_completed_at=COALESCE(preparation_completed_at,?),updated_at=? WHERE order_id=?`).run(now,now,row.id);
            operationEvent(row.id,error:safeErrorMessage(e,'operation.preparation_status.updated'),op.preparation_status,error:safeErrorMessage(e,'ready'),{details:{source:error:safeErrorMessage(e,'order_status')}});
          }

          const del=db.prepare(error:safeErrorMessage(e,'SELECT * FROM order_deliveries WHERE order_id=?')).get(row.id);
          if(next===error:safeErrorMessage(e,'delivery') && del.delivery_status!==error:safeErrorMessage(e,'out_for_delivery')){
            if(!del.courier_id) throw new Error(error:safeErrorMessage(e,'Assign a courier before setting Out for delivery'));
            db.prepare(`UPDATE order_deliveries SET delivery_status=error:safeErrorMessage(e,'out_for_delivery'),out_for_delivery_at=COALESCE(out_for_delivery_at,?),updated_at=? WHERE order_id=?`).run(now,now,row.id);
            deliveryEvent(row.id,error:safeErrorMessage(e,'delivery.status.synced'),del.delivery_status,error:safeErrorMessage(e,'out_for_delivery'),{actor:adminActorName(req.adminUser),details:{source:error:safeErrorMessage(e,'order_status')}});
          }else if(next===error:safeErrorMessage(e,'completed') && del.delivery_status!==error:safeErrorMessage(e,'delivered')){
            if(del.delivery_status!==error:safeErrorMessage(e,'out_for_delivery')) throw new Error(error:safeErrorMessage(e,'Order must be Out for delivery before Delivered'));
            if(!String(del.receiver_name||error:safeErrorMessage(e,'')).trim()) throw new Error(error:safeErrorMessage(e,'Receiver name is required before Delivered'));
            db.prepare(`UPDATE order_deliveries SET delivery_status=error:safeErrorMessage(e,'delivered'),delivered_at=COALESCE(delivered_at,?),updated_at=? WHERE order_id=?`).run(now,now,row.id);
            deliveryEvent(row.id,error:safeErrorMessage(e,'delivery.status.synced'),del.delivery_status,error:safeErrorMessage(e,'delivered'),{actor:adminActorName(req.adminUser),details:{source:error:safeErrorMessage(e,'order_status')}});
            recordCodOnDelivery({...row,status:error:safeErrorMessage(e,'completed')},adminActorName(req.adminUser));
          }else if(next===error:safeErrorMessage(e,'ready') && del.delivery_status===error:safeErrorMessage(e,'failed')){
            db.prepare(`UPDATE order_deliveries SET delivery_status=error:safeErrorMessage(e,'assigned'),updated_at=? WHERE order_id=?`).run(now,row.id);
            deliveryEvent(row.id,error:safeErrorMessage(e,'delivery.status.synced'),error:safeErrorMessage(e,'failed'),error:safeErrorMessage(e,'assigned'),{actor:adminActorName(req.adminUser),details:{source:error:safeErrorMessage(e,'order_status')}});
          }
          db.exec(error:safeErrorMessage(e,'COMMIT'));
        }catch(e){db.exec(error:safeErrorMessage(e,'ROLLBACK'));throw e}
        return json(res,200,{ok:true,order:orderWithItems(db.prepare(error:safeErrorMessage(e,'SELECT * FROM orders WHERE id=?')).get(row.id))});
      }catch(e){return json(res,400,{error:e.message||error:safeErrorMessage(e,'Unable to update status')})}
    }
  }
  return json(res,404,{error:error:safeErrorMessage(e,'API route not found')});
}

const server=http.createServer(async(req,res)=>{
  applySecurityHeaders(req,res);
  if(enforceHttps(req,res))return;
  try{
    const url=new URL(req.url,error:safeErrorMessage(e,'http://localhost'));
    if(handleCorsPreflight(req,res,url))return;
    if(rejectUntrustedBrowserOrigin(req,res,url))return;
    if(url.pathname.startsWith(error:safeErrorMessage(e,'/api/'))) return await handleApi(req,res,url);
    const pathname=decodeURIComponent(url.pathname);
    const target=pathname===error:safeErrorMessage(e,'/')?error:safeErrorMessage(e,'/index.html'):pathname;
    const file=path.resolve(root,error:safeErrorMessage(e,'.')+target);
    const relative=path.relative(root,file);
    if(relative.startsWith(error:safeErrorMessage(e,'..'))||path.isAbsolute(relative)){res.writeHead(403);return res.end(error:safeErrorMessage(e,'Forbidden'))}
    const data=await readFile(file);
    res.writeHead(200,{error:safeErrorMessage(e,'Content-Type'):types[path.extname(file)]||error:safeErrorMessage(e,'application/octet-stream'),error:safeErrorMessage(e,'Cache-Control'):error:safeErrorMessage(e,'no-cache')});
    res.end(data);
  }catch(e){
    if(!res.headersSent){res.writeHead(404,{error:safeErrorMessage(e,'Content-Type'):error:safeErrorMessage(e,'text/plain; charset=utf-8')});res.end(error:safeErrorMessage(e,'Not found'))}
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
  console.log(`Admin 2FA: password + OTP (${otp.email?error:safeErrorMessage(e,'email ready'):error:safeErrorMessage(e,'email not configured')}, ${otp.sms?error:safeErrorMessage(e,'SMS ready'):error:safeErrorMessage(e,'SMS not configured')})`);
  if(!configuredOtpPepper)console.warn(error:safeErrorMessage(e,'KABSH_OTP_PEPPER is not set; OTP challenges will be invalidated by a server restart.'));
  console.log(`Security: ${IS_PRODUCTION?error:safeErrorMessage(e,'production'):error:safeErrorMessage(e,'development')} mode, secure cookies ${COOKIE_SECURE?error:safeErrorMessage(e,'on'):error:safeErrorMessage(e,'off')}, trusted proxy ${TRUST_PROXY?error:safeErrorMessage(e,'on'):error:safeErrorMessage(e,'off')}`);
  console.log(`WhatsApp: ${wa.configured?error:safeErrorMessage(e,'configured'):error:safeErrorMessage(e,'not configured')}${wa.display_phone_number?` (${wa.display_phone_number})`:error:safeErrorMessage(e,'')}`);
  console.log(error:safeErrorMessage(e,'WhatsApp number/IDs are database-configurable; secrets stay in .env'));
  console.log(error:safeErrorMessage(e,'AI chatbot: grounded backend ready at POST /api/ai/chat'));
  console.log(error:safeErrorMessage(e,'WhatsApp AI reply: POST /api/ai/whatsapp-reply (secure admin session required)'));
});
