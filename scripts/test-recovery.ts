import assert from 'node:assert/strict'
import {readXmlDraft,writeXmlDraft} from '../src/renderer/utilities/editor-recovery'
import {registerXmlDocument,changedXml,flushXmlDrafts,fieldRecoveryKey,readFieldDraft,writeFieldDraft,pendingXml} from '../src/renderer/utilities/xml-recovery'
const values=new Map<string,string>()
const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)}} as Storage
const truck={},engine={},truckNode={parent:truck,name:'Truck'},engineNode={parent:engine,name:'Engine'}
let vehicle='<Truck/>',linked='<Engine/>'
registerXmlDocument(truck,'vehicle.xml',vehicle,()=>vehicle,storage)
registerXmlDocument(engine,'engine.xml',linked,()=>linked,storage)
vehicle='<Truck Fuel="500"/>';linked='<Engine Torque="1200"/>'
changedXml(truckNode);changedXml(engineNode);flushXmlDrafts()
assert.equal(readXmlDraft(storage,'vehicle.xml')?.xml,vehicle)
assert.equal(readXmlDraft(storage,'engine.xml')?.xml,linked)
assert.equal(pendingXml(storage,'engine.xml','<Engine/>'),linked)
assert.equal(pendingXml(storage,'engine.xml','<Engine Torque="999"/>'),undefined)
const key=fieldRecoveryKey(engineNode,'Torque')!
writeFieldDraft(storage,key,1200,'1200e')
assert.equal(readFieldDraft(storage,key,1200),'1200e')
assert.equal(readFieldDraft(storage,key,1000),undefined)
assert.notEqual(fieldRecoveryKey(truckNode,'Torque'),key)
writeXmlDraft(storage,'engine.xml',linked,linked)
assert.equal(readXmlDraft(storage,'engine.xml'),undefined)
changedXml(undefined)
console.log('Recovery passed: linked documents, pending fields, stale baselines and explicit confirmation remain separate from game writes.')
