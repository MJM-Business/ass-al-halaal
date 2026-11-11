import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

async function freePort(){
  return await new Promise((resolve,reject)=>{
    const server=net.createServer();
    server.unref();
    server.on('error',reject);
    server.listen(0,'127.0.0.1',()=>{
      const address=server.address();
      const port=typeof address==='object'&&address?address.port:0;
      server.close(err=>err?reject(err):resolve(port));
    });
  });
}

async function waitForHealth(base,child,logs){
  const deadline=Date.now()+10_000;
  while(Date.now()<deadline){
    if(child.exitCode!==null)throw new Error(`server exited early (code ${child.exitCode})\n${logs.join('')}`);
    try{
      const response=await fetch(`${base}/api/health`);
      if(response.ok)return;
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error(`server did not become ready\n${logs.join('')}`);
}

function cookieFrom(response){
  const raw=response.headers.get('set-cookie')||'';
  return raw.split(';')[0];
}

async function jsonRequest(url,{method='GET',cookie='',body}={}){
  const headers={Origin:new URL(url).origin};
  if(cookie)headers.Cookie=cookie;
  if(body!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(url,{
    method,
    headers,
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const payload=await response.json().catch(()=>({}));
  return {response,payload};
}

test('customer order endpoints enforce ownership and prevent IDOR',async t=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'ahl-security-'));
  const dbPath=path.join(temp,'security.sqlite3');
  const port=await freePort();
  const base=`http://127.0.0.1:${port}`;
  const logs=[];

  const child=spawn(process.execPath,['scripts/serve.mjs'],{
    cwd:path.resolve('.'),
    env:{
      ...process.env,
      NODE_ENV:'development',
      HOST:'127.0.0.1',
      PORT:String(port),
      KABSH_DB_PATH:dbPath,
      KABSH_TRUST_PROXY:'0',
      KABSH_COOKIE_SECURE:'0',
      KABSH_OTP_PEPPER:'test-only-security-pepper-do-not-use-in-production'
    },
    stdio:['ignore','pipe','pipe']
  });
  child.stdout.on('data',chunk=>logs.push(String(chunk)));
  child.stderr.on('data',chunk=>logs.push(String(chunk)));

  t.after(async()=>{
    if(child.exitCode===null){
      child.kill('SIGTERM');
      await new Promise(resolve=>{
        const timer=setTimeout(resolve,1500);
        child.once('exit',()=>{clearTimeout(timer);resolve()});
      });
    }
    await rm(temp,{recursive:true,force:true});
  });

  await waitForHealth(base,child,logs);

  const productsRes=await jsonRequest(`${base}/api/products`);
  assert.equal(productsRes.response.status,200);
  assert.ok(Array.isArray(productsRes.payload.products)&&productsRes.payload.products.length>0);
  const product=productsRes.payload.products[0];

  const registerA=await jsonRequest(`${base}/api/customer/register`,{
    method:'POST',
    body:{
      name:'Security Customer A',
      email:'security-a@example.test',
      phone:'0500000001',
      password:'Test!Pass123'
    }
  });
  assert.equal(registerA.response.status,201);
  const cookieA=cookieFrom(registerA.response);
  assert.ok(cookieA.includes('kn_customer_session='));

  const createA=await jsonRequest(`${base}/api/orders`,{
    method:'POST',
    cookie:cookieA,
    body:{
      phone:'0500000001',
      city:'Jeddah',
      district:'حي الروضة',
      address:'Security test address 1',
      deliveryDate:'2026-12-01',
      slot:'18:00-20:00',
      notes:'IDOR regression test',
      items:[{id:product.id,qty:1,pack:'bags',cut:'medium',fat:'regular',head:'raw',tripe:'cleaned'}]
    }
  });
  assert.equal(createA.response.status,201);
  const orderA=createA.payload.order;
  assert.ok(orderA?.id);
  assert.ok(orderA?.order_code);

  const registerB=await jsonRequest(`${base}/api/customer/register`,{
    method:'POST',
    body:{
      name:'Security Customer B',
      email:'security-b@example.test',
      phone:'0500000002',
      password:'Test!Pass123'
    }
  });
  assert.equal(registerB.response.status,201);
  const cookieB=cookieFrom(registerB.response);
  assert.ok(cookieB.includes('kn_customer_session='));

  const ownerById=await jsonRequest(`${base}/api/orders/${encodeURIComponent(orderA.id)}`,{cookie:cookieA});
  assert.equal(ownerById.response.status,200);
  assert.equal(ownerById.payload.order.id,orderA.id);

  const attackerById=await jsonRequest(`${base}/api/orders/${encodeURIComponent(orderA.id)}`,{cookie:cookieB});
  assert.equal(attackerById.response.status,404);
  assert.equal(attackerById.payload.error,'Order not found');

  const attackerByCode=await jsonRequest(`${base}/api/orders/${encodeURIComponent(orderA.order_code)}`,{cookie:cookieB});
  assert.equal(attackerByCode.response.status,404);
  assert.equal(attackerByCode.payload.error,'Order not found');

  const attackerListByCode=await jsonRequest(`${base}/api/orders?code=${encodeURIComponent(orderA.order_code)}`,{cookie:cookieB});
  assert.equal(attackerListByCode.response.status,200);
  assert.deepEqual(attackerListByCode.payload.orders,[]);

  const anonymous=await jsonRequest(`${base}/api/orders/${encodeURIComponent(orderA.id)}`);
  assert.equal(anonymous.response.status,401);
  assert.equal(anonymous.payload.code,'CUSTOMER_AUTH_REQUIRED');
});


test('JSON API input hardening rejects unsafe payloads',async t=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'ahl-input-security-'));
  const dbPath=path.join(temp,'security.sqlite3');
  const port=await freePort();
  const base=`http://127.0.0.1:${port}`;
  const logs=[];

  const child=spawn(process.execPath,['scripts/serve.mjs'],{
    cwd:path.resolve('.'),
    env:{
      ...process.env,
      NODE_ENV:'development',
      HOST:'127.0.0.1',
      PORT:String(port),
      KABSH_DB_PATH:dbPath,
      KABSH_TRUST_PROXY:'0',
      KABSH_COOKIE_SECURE:'0',
      KABSH_OTP_PEPPER:'test-only-security-pepper-do-not-use-in-production'
    },
    stdio:['ignore','pipe','pipe']
  });
  child.stdout.on('data',chunk=>logs.push(String(chunk)));
  child.stderr.on('data',chunk=>logs.push(String(chunk)));

  t.after(async()=>{
    if(child.exitCode===null){
      child.kill('SIGTERM');
      await new Promise(resolve=>{
        const timer=setTimeout(resolve,1500);
        child.once('exit',()=>{clearTimeout(timer);resolve()});
      });
    }
    await rm(temp,{recursive:true,force:true});
  });

  await waitForHealth(base,child,logs);

  const badType=await fetch(`${base}/api/customer/login`,{
    method:'POST',
    headers:{Origin:base,'Content-Type':'text/plain'},
    body:'{}'
  });
  assert.equal(badType.status,400);
  assert.match((await badType.json()).error,/Content-Type must be application\/json/);

  const primitive=await fetch(`${base}/api/customer/login`,{
    method:'POST',
    headers:{Origin:base,'Content-Type':'application/json'},
    body:'[]'
  });
  assert.equal(primitive.status,400);
  assert.match((await primitive.json()).error,/JSON body must be an object/);

  const prototypePayload=await fetch(`${base}/api/customer/login`,{
    method:'POST',
    headers:{Origin:base,'Content-Type':'application/json'},
    body:'{"__proto__":{"polluted":true},"identifier":"x","password":"x"}'
  });
  assert.equal(prototypePayload.status,400);
  assert.match((await prototypePayload.json()).error,/Unsafe JSON key rejected/);
  assert.equal({}.polluted,undefined);

  let nested={value:'ok'};
  for(let i=0;i<10;i++)nested={child:nested};
  const deep=await fetch(`${base}/api/customer/login`,{
    method:'POST',
    headers:{Origin:base,'Content-Type':'application/json'},
    body:JSON.stringify(nested)
  });
  assert.equal(deep.status,400);
  assert.match((await deep.json()).error,/nested too deeply/);

  const control=await fetch(`${base}/api/customer/login`,{
    method:'POST',
    headers:{Origin:base,'Content-Type':'application/json'},
    body:'{"identifier":"user@example.test","password":"bad\\u0001value"}'
  });
  assert.equal(control.status,400);
  assert.match((await control.json()).error,/unsupported control characters/);

  const tooLong=await fetch(`${base}/api/customer/login`,{
    method:'POST',
    headers:{Origin:base,'Content-Type':'application/json'},
    body:JSON.stringify({identifier:'a'.repeat(20_001),password:'x'})
  });
  assert.equal(tooLong.status,400);
  assert.match((await tooLong.json()).error,/Input value is too long/);
});


test('secure image upload validation and protected media access',async t=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'ahl-upload-security-'));
  const dbPath=path.join(temp,'security.sqlite3');
  const port=await freePort();
  const base=`http://127.0.0.1:${port}`;
  const logs=[];

  const child=spawn(process.execPath,['scripts/serve.mjs'],{
    cwd:path.resolve('.'),
    env:{
      ...process.env,
      NODE_ENV:'development',
      HOST:'127.0.0.1',
      PORT:String(port),
      KABSH_DB_PATH:dbPath,
      KABSH_TRUST_PROXY:'0',
      KABSH_COOKIE_SECURE:'0',
      KABSH_OTP_PEPPER:'test-only-security-pepper-do-not-use-in-production',
      KABSH_ADMIN_BOOTSTRAP_PASSWORD:'SecurityAdmin!123',
      KABSH_RESET_ADMIN_PASSWORD:'1'
    },
    stdio:['ignore','pipe','pipe']
  });
  child.stdout.on('data',chunk=>logs.push(String(chunk)));
  child.stderr.on('data',chunk=>logs.push(String(chunk)));

  t.after(async()=>{
    if(child.exitCode===null){
      child.kill('SIGTERM');
      await new Promise(resolve=>{
        const timer=setTimeout(resolve,1500);
        child.once('exit',()=>{clearTimeout(timer);resolve()});
      });
    }
    await rm(temp,{recursive:true,force:true});
  });

  await waitForHealth(base,child,logs);

  const register=await jsonRequest(`${base}/api/customer/register`,{
    method:'POST',
    body:{
      name:'Upload Customer',
      email:'upload-customer@example.test',
      phone:'0500000003',
      password:'Test!Pass123'
    }
  });
  assert.equal(register.response.status,201);
  const customerCookie=cookieFrom(register.response);

  const productsRes=await jsonRequest(`${base}/api/products`);
  const product=productsRes.payload.products[0];
  const create=await jsonRequest(`${base}/api/orders`,{
    method:'POST',
    cookie:customerCookie,
    body:{
      phone:'0500000003',
      city:'Jeddah',
      district:'حي الروضة',
      address:'Upload test address',
      deliveryDate:'2026-12-01',
      slot:'18:00-20:00',
      items:[{id:product.id,qty:1,pack:'bags',cut:'medium',fat:'regular',head:'raw',tripe:'cleaned'}]
    }
  });
  assert.equal(create.response.status,201);
  const orderId=create.payload.order.id;

  // Upload route is admin-only; customer session must not be enough.
  const forbiddenCustomer=await fetch(`${base}/api/admin/orders/${encodeURIComponent(orderId)}/media/upload`,{
    method:'POST',
    headers:{Origin:base,Cookie:customerCookie,'Content-Type':'image/png'},
    body:Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])
  });
  assert.equal(forbiddenCustomer.status,401);

  // Public unauthenticated media IDs must not be enumerable.
  const missing=await fetch(`${base}/api/media/00000000-0000-0000-0000-000000000000.png`,{
    headers:{Origin:base}
  });
  assert.equal(missing.status,404);

  // Helper-level magic byte validation is covered separately below.
});

test('upload helper rejects MIME spoofing and oversized files',async()=>{
  const {validateImageUpload,MAX_UPLOAD_BYTES,safeStoredFilename}=await import('./upload-security.mjs');

  assert.throws(
    ()=>validateImageUpload({contentType:'image/png',buffer:Buffer.from('not a png')}),
    /does not match declared image type/
  );

  const png=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]);
  const info=validateImageUpload({contentType:'image/png',buffer:png});
  assert.equal(info.mime,'image/png');
  assert.equal(info.ext,'.png');

  assert.throws(
    ()=>validateImageUpload({contentType:'image/gif',buffer:Buffer.from('GIF89a')}),
    /Unsupported image type/
  );

  assert.throws(
    ()=>validateImageUpload({contentType:'image/png',buffer:Buffer.alloc(MAX_UPLOAD_BYTES+1)}),
    /exceeds 5 MB/
  );

  assert.match(safeStoredFilename('12345678-1234-1234-1234-123456789abc','.png'),/\.png$/);
  assert.throws(()=>safeStoredFilename('../../etc/passwd','.png'),/Invalid storage identifier/);
});


test('production API errors hide internal parser details',async t=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'ahl-prod-errors-'));
  const dbPath=path.join(temp,'security.sqlite3');
  const port=await freePort();
  const base=`http://127.0.0.1:${port}`;
  const logs=[];

  const child=spawn(process.execPath,['scripts/serve.mjs'],{
    cwd:path.resolve('.'),
    env:{
      ...process.env,
      NODE_ENV:'production',
      HOST:'127.0.0.1',
      PORT:String(port),
      KABSH_DB_PATH:dbPath,
      KABSH_TRUST_PROXY:'1',
      KABSH_COOKIE_SECURE:'1',
      KABSH_ENFORCE_HTTPS:'0',
      KABSH_PUBLIC_ORIGIN:base,
      KABSH_OTP_PEPPER:'production-test-pepper-not-a-real-secret'
    },
    stdio:['ignore','pipe','pipe']
  });
  child.stdout.on('data',chunk=>logs.push(String(chunk)));
  child.stderr.on('data',chunk=>logs.push(String(chunk)));

  t.after(async()=>{
    if(child.exitCode===null){
      child.kill('SIGTERM');
      await new Promise(resolve=>{
        const timer=setTimeout(resolve,1500);
        child.once('exit',()=>{clearTimeout(timer);resolve()});
      });
    }
    await rm(temp,{recursive:true,force:true});
  });

  await waitForHealth(base,child,logs);

  const response=await fetch(`${base}/api/customer/login`,{
    method:'POST',
    headers:{Origin:base,'Content-Type':'text/plain','X-Forwarded-Proto':'https'},
    body:'{}'
  });
  assert.equal(response.status,400);
  const payload=await response.json();
  assert.equal(payload.error,'Unable to sign in');
  assert.doesNotMatch(JSON.stringify(payload),/Content-Type must be application\/json/);
});


test('customer passwords use bcrypt and legacy scrypt hashes upgrade after login',async t=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'ahl-bcrypt-security-'));
  const dbPath=path.join(temp,'security.sqlite3');
  const port=await freePort();
  const base=`http://127.0.0.1:${port}`;
  const logs=[];

  const child=spawn(process.execPath,['scripts/serve.mjs'],{
    cwd:path.resolve('.'),
    env:{
      ...process.env,
      NODE_ENV:'development',
      HOST:'127.0.0.1',
      PORT:String(port),
      KABSH_DB_PATH:dbPath,
      KABSH_TRUST_PROXY:'0',
      KABSH_COOKIE_SECURE:'0',
      KABSH_OTP_PEPPER:'test-only-security-pepper-do-not-use-in-production'
    },
    stdio:['ignore','pipe','pipe']
  });
  child.stdout.on('data',chunk=>logs.push(String(chunk)));
  child.stderr.on('data',chunk=>logs.push(String(chunk)));

  t.after(async()=>{
    if(child.exitCode===null){
      child.kill('SIGTERM');
      await new Promise(resolve=>{
        const timer=setTimeout(resolve,1500);
        child.once('exit',()=>{clearTimeout(timer);resolve()});
      });
    }
    await rm(temp,{recursive:true,force:true});
  });

  await waitForHealth(base,child,logs);

  const password='Migration!Pass123';
  const register=await jsonRequest(`${base}/api/customer/register`,{
    method:'POST',
    body:{
      name:'Bcrypt Customer',
      email:'bcrypt-customer@example.test',
      phone:'0500000004',
      password
    }
  });
  assert.equal(register.response.status,201);

  const db=new DatabaseSync(dbPath);
  const customerId=register.payload.user.id;
  let row=db.prepare('SELECT password_hash FROM customer_accounts WHERE id=?').get(customerId);
  assert.match(row.password_hash,/^\$2[aby]\$12\$/);

  await jsonRequest(`${base}/api/customer/logout`,{
    method:'POST',
    cookie:cookieFrom(register.response),
    body:{}
  });

  const salt=crypto.randomBytes(16).toString('hex');
  const legacyHash=crypto.scryptSync(password,salt,64).toString('hex');
  db.prepare('UPDATE customer_accounts SET password_hash=? WHERE id=?').run(`scrypt$${salt}$${legacyHash}`,customerId);

  const login=await jsonRequest(`${base}/api/customer/login`,{
    method:'POST',
    body:{identifier:'bcrypt-customer@example.test',password}
  });
  assert.equal(login.response.status,200);

  row=db.prepare('SELECT password_hash FROM customer_accounts WHERE id=?').get(customerId);
  assert.match(row.password_hash,/^\$2[aby]\$12\$/);
  db.close();
});


test('customer registration and login endpoints enforce rate limiting',async t=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'ahl-rate-limit-'));
  const dbPath=path.join(temp,'security.sqlite3');
  const port=await freePort();
  const base=`http://127.0.0.1:${port}`;
  const logs=[];

  const child=spawn(process.execPath,['scripts/serve.mjs'],{
    cwd:path.resolve('.'),
    env:{
      ...process.env,
      NODE_ENV:'development',
      HOST:'127.0.0.1',
      PORT:String(port),
      KABSH_DB_PATH:dbPath,
      KABSH_TRUST_PROXY:'0',
      KABSH_COOKIE_SECURE:'0',
      KABSH_OTP_PEPPER:'test-only-security-pepper-do-not-use-in-production'
    },
    stdio:['ignore','pipe','pipe']
  });
  child.stdout.on('data',chunk=>logs.push(String(chunk)));
  child.stderr.on('data',chunk=>logs.push(String(chunk)));

  t.after(async()=>{
    if(child.exitCode===null){
      child.kill('SIGTERM');
      await new Promise(resolve=>{
        const timer=setTimeout(resolve,1500);
        child.once('exit',()=>{clearTimeout(timer);resolve()});
      });
    }
    await rm(temp,{recursive:true,force:true});
  });

  await waitForHealth(base,child,logs);

  let registerResponse;
  for(let i=0;i<11;i++){
    registerResponse=await fetch(`${base}/api/customer/register`,{
      method:'POST',
      headers:{Origin:base,'Content-Type':'application/json'},
      body:JSON.stringify({})
    });
  }
  assert.equal(registerResponse.status,429);
  const registerPayload=await registerResponse.json();
  assert.equal(registerPayload.code,'CUSTOMER_REGISTER_RATE_LIMITED');
  assert.ok(Number(registerPayload.retry_after)>0);

  child.kill('SIGTERM');
  await new Promise(resolve=>{
    const timer=setTimeout(resolve,1500);
    child.once('exit',()=>{clearTimeout(timer);resolve()});
  });

  const temp2=await mkdtemp(path.join(os.tmpdir(),'ahl-rate-limit-login-'));
  const dbPath2=path.join(temp2,'security.sqlite3');
  const port2=await freePort();
  const base2=`http://127.0.0.1:${port2}`;
  const logs2=[];

  const child2=spawn(process.execPath,['scripts/serve.mjs'],{
    cwd:path.resolve('.'),
    env:{
      ...process.env,
      NODE_ENV:'development',
      HOST:'127.0.0.1',
      PORT:String(port2),
      KABSH_DB_PATH:dbPath2,
      KABSH_TRUST_PROXY:'0',
      KABSH_COOKIE_SECURE:'0',
      KABSH_OTP_PEPPER:'test-only-security-pepper-do-not-use-in-production'
    },
    stdio:['ignore','pipe','pipe']
  });
  child2.stdout.on('data',chunk=>logs2.push(String(chunk)));
  child2.stderr.on('data',chunk=>logs2.push(String(chunk)));

  t.after(async()=>{
    if(child2.exitCode===null){
      child2.kill('SIGTERM');
      await new Promise(resolve=>{
        const timer=setTimeout(resolve,1500);
        child2.once('exit',()=>{clearTimeout(timer);resolve()});
      });
    }
    await rm(temp2,{recursive:true,force:true});
  });

  await waitForHealth(base2,child2,logs2);

  let loginResponse;
  for(let i=0;i<11;i++){
    loginResponse=await fetch(`${base2}/api/customer/login`,{
      method:'POST',
      headers:{Origin:base2,'Content-Type':'application/json'},
      body:JSON.stringify({identifier:'attacker@example.test',password:'wrong-password'})
    });
  }
  assert.equal(loginResponse.status,429);
  const loginPayload=await loginResponse.json();
  assert.equal(loginPayload.code,'CUSTOMER_LOGIN_RATE_LIMITED');
  assert.ok(Number(loginPayload.retry_after)>0);
});


test('loopback origin is allowed only when the request itself reaches the local server',async t=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'ahl-loopback-origin-'));
  const dbPath=path.join(temp,'security.sqlite3');
  const port=await freePort();
  const base=`http://127.0.0.1:${port}`;
  const logs=[];

  const child=spawn(process.execPath,['scripts/serve.mjs'],{
    cwd:path.resolve('.'),
    env:{
      ...process.env,
      NODE_ENV:'production',
      HOST:'127.0.0.1',
      PORT:String(port),
      KABSH_DB_PATH:dbPath,
      KABSH_TRUST_PROXY:'0',
      KABSH_COOKIE_SECURE:'0',
      KABSH_ENFORCE_HTTPS:'0',
      KABSH_PUBLIC_ORIGIN:'https://ass-al-halaal.onrender.com',
      KABSH_OTP_PEPPER:'production-test-pepper-not-a-real-secret'
    },
    stdio:['ignore','pipe','pipe']
  });
  child.stdout.on('data',chunk=>logs.push(String(chunk)));
  child.stderr.on('data',chunk=>logs.push(String(chunk)));

  t.after(async()=>{
    if(child.exitCode===null){
      child.kill('SIGTERM');
      await new Promise(resolve=>{
        const timer=setTimeout(resolve,1500);
        child.once('exit',()=>{clearTimeout(timer);resolve()});
      });
    }
    await rm(temp,{recursive:true,force:true});
  });

  await waitForHealth(base,child,logs);

  const response=await fetch(`${base}/api/customer/register`,{
    method:'POST',
    headers:{Origin:base,'Content-Type':'application/json'},
    body:JSON.stringify({
      name:'Local Origin Customer',
      email:'local-origin@example.test',
      phone:'0500000099',
      password:'Local!Pass123'
    })
  });
  const payload=await response.json();
  assert.equal(response.status,201);
  assert.equal(payload?.user?.email,'local-origin@example.test');
});
