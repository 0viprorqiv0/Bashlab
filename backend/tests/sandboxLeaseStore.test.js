import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryLeaseStore } from '../src/services/sandboxLeaseStore.js';

test('parallel claims for one user return one allocating lease', async () => {
 const store=createMemoryLeaseStore({maxActiveLeases:100});
 const leases=await Promise.all(Array.from({length:20},()=>store.claim({userId:'alice',lessonId:'lab'})));
 assert.equal(new Set(leases.map(x=>x.lease.leaseId)).size,1);
 assert.equal((await store.all()).length,1);
});
test('a failed lease keeps its workspace reservation', async()=>{
 const store=createMemoryLeaseStore();
 const {lease}=await store.claim({userId:'alice',lessonId:'lab'});
 await store.fail({leaseId:lease.leaseId});
 const retry=await store.claim({userId:'alice',lessonId:'lab'});
 assert.equal(retry.lease.workspaceId,lease.workspaceId);
});
