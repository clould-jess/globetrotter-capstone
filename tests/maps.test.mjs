import assert from 'node:assert/strict';
import test from 'node:test';
import { googleRouteLinks, formatDistance, formatDuration, normaliseSearch, validStop } from '../lib/maps.ts';

test('mobile Google links preserve all ten stops across overlapping segments', () => {
  const stops = Array.from({length:10},(_,i)=>({name:'Stop '+i,lat:3+i/100,lng:11+i/100}));
  const links=googleRouteLinks(stops);
  assert.equal(links.length,3);
  assert.deepEqual(links.map(l=>[l.from,l.to]),[[1,5],[5,9],[9,10]]);
  for (const link of links) {
    const p=new URL(link.href).searchParams;
    assert.ok((p.get('waypoints')?.split('|').length ?? 0)<=3);
    assert.equal(p.get('origin'),stops[link.from-1].lat+','+stops[link.from-1].lng);
    assert.equal(p.get('destination'),stops[link.to-1].lat+','+stops[link.to-1].lng);
  }
  assert.deepEqual(googleRouteLinks(stops.slice(0,1)),[]);
});
test('distance and duration are readable with no spurious zero minutes',()=>{
  assert.equal(formatDuration(3600),'1 h'); assert.equal(formatDuration(3660),'1 h 1 min');
  assert.equal(formatDistance(6250,'en'),'6.3 km'); assert.equal(formatDistance(800),'800 m');
});
test('search ignores accents and invalid coordinates are rejected',()=>{
  assert.equal(normaliseSearch(' Yaoundé '),'yaounde');
  assert.ok(validStop({name:'A',lat:3,lng:11}));
  assert.ok(!validStop({name:'A',lat:NaN,lng:11}));
  assert.ok(!validStop({name:' ',lat:3,lng:11}));
});
