import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

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
