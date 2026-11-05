import test from 'node:test';import assert from 'node:assert/strict';import {total,validPhone,validCity,safe,products} from '../www/shop.js';
test('totals include chosen packaging and quantity',()=>assert.equal(total([{unit:260,qty:2},{unit:115,qty:1}]),635));
test('Saudi mobile formats accepted, invalid phones rejected',()=>{for(const n of ['0501234567','+966501234567','966501234567'])assert.ok(validPhone(n));for(const n of ['123','+971501234567','05012345678','abc'])assert.ok(!validPhone(n))});
test('Jeddah delivery boundary',()=>{for(const c of ['Jeddah','jeddah','جدة','جده'])assert.ok(validCity(c));for(const c of ['Riyadh','Dubai',''])assert.ok(!validCity(c))});
test('customer content is escaped before rendering',()=>assert.equal(safe('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;'));
test('catalog has unique ids and positive amounts',()=>{assert.equal(new Set(products.map(p=>p.id)).size,products.length);assert.ok(products.every(p=>p.price>0&&p.kg>0&&p.ar&&p.en))});
