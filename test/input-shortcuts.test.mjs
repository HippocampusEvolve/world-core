import test from 'node:test'
import assert from 'node:assert/strict'
import {Input} from '../dist/core/index.js'

test('browser shortcuts never trigger world actions or movement',()=>{
  const old=globalThis.addEventListener,listeners={}
  globalThis.addEventListener=(name,fn)=>{listeners[name]=fn}
  try{
    let actions=0,prevented=0
    const input=new Input({look:{isLocked:true},target:{addEventListener(){}},onAction:()=>actions++})
    for(const modifier of ['ctrlKey','metaKey','altKey'])for(const code of ['KeyF','KeyW','Space']) {
      listeners.keydown({[modifier]:true,code,target:null,preventDefault(){prevented++}})
    }
    assert.equal(actions,0);assert.equal(prevented,0)
    const intent=input.update(1/60);assert.equal(intent.move.y,0);assert.equal(intent.jump,false)
    listeners.keydown({code:'KeyF',target:null,preventDefault(){}});assert.equal(actions,1)
  }finally{globalThis.addEventListener=old}
})
