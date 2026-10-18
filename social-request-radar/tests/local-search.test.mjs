import test from 'node:test';
import assert from 'node:assert/strict';
import {resultIndex} from '../github-pages/source/local-search.mjs';
import {Virtualizer} from '@tanstack/react-virtual';
test('MiniSearch filters the whole result set with normalized Arabic and optional typo matching',()=>{
  const index=resultIndex([{id:'one',text:'أحتاج اِستشارة بالمحامي',author:'saad'},{id:'two',text:'أبحث عن بيت للإيجار',author:'other'}]);
  assert.deepEqual(index.search('استشارة محامي'),['one']);assert.deepEqual(index.search('بيت'),['two']);assert.deepEqual(index.search('saad'),['one']);
  assert.deepEqual(index.search('استشارت',{fuzzy:true}),['one']);assert.deepEqual(index.search('غيرموجود'),[]);
});
test('TanStack calculates a bounded visible window for a large list',()=>{
  const list=new Virtualizer({count:2000,getScrollElement:()=>null,estimateSize:()=>100,initialRect:{width:800,height:500},scrollToFn:()=>{},observeElementRect:()=>()=>{},observeElementOffset:()=>()=>{},overscan:3});
  assert.equal(list.getTotalSize(),200000);const items=list.getVirtualItems();assert.ok(items.length>0&&items.length<20);assert.equal(items[0].index,0);
});
