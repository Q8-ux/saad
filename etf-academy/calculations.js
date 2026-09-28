/* Pure educational models. No market data, recommendations, or trading. */
(function(root){
 'use strict';
 function valid(n,min,max){return typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;}
 function project(p,c,years,r,fee){
  if(!valid(p,0,1e8)||!valid(c,0,1e6)||!valid(years,1,50)||!Number.isInteger(years)||!valid(r,-50,50)||!valid(fee,0,10))throw Error('تحقّق من المبالغ والمدة والنسب ضمن الحدود الموضّحة.');
  const annual=1+(r-fee)/100, monthly=Math.pow(annual,1/12);let value=p;const points=[p];
  for(let m=1;m<=years*12;m++){value=value*monthly+c;if(m%12===0)points.push(value);}
  return {value,paid:p+c*12*years,points};
 }
 function fees(p,c,years,r,low,high){
  if(high<low)throw Error('اجعل رسوم الخيار ب مساوية لرسوم الخيار أ أو أعلى منها.');
  const a=project(p,c,years,r,low),b=project(p,c,years,r,high);return {a,b,difference:a.value-b.value};
 }
 function allocation(stocks,bonds,stockShock=-30,bondShock=-5){
  if(!valid(stocks,0,100)||!valid(bonds,0,100)||stocks+bonds>100)throw Error('يجب ألا يتجاوز مجموع الأسهم والسندات 100%.');
  return {stocks,bonds,cash:100-stocks-bonds,shock:(stocks*stockShock+bonds*bondShock)/100};
 }
 function order(bid,ask,qty,commission){
  if(!valid(bid,0.001,1e6)||!valid(ask,bid,1e6)||!valid(qty,1,1e6)||!Number.isInteger(qty)||!valid(commission,0,1e5))throw Error('أدخل أسعارًا موجبة وكمية صحيحة، واجعل سعر البائع مساويًا لسعر المشتري أو أعلى.');
  const spread=ask-bid,buy=ask*qty+commission,sell=bid*qty-commission;
  return {spread,spreadPct:spread/((ask+bid)/2)*100,buy,sell,roundTrip:buy-sell};
 }
 function rebalance(values,weights){
  if(values.length!==3||weights.length!==3||values.some(x=>!valid(x,0,1e8))||weights.some(x=>!valid(x,0,100))||Math.abs(weights.reduce((a,b)=>a+b,0)-100)>1e-8)throw Error('تحقّق من القيم واجعل مجموع الأوزان المستهدفة 100%.');
  const total=values.reduce((a,b)=>a+b,0);if(total===0)throw Error('أدخل قيمة موجبة في فئة واحدة على الأقل.');
  return {total,rows:values.map((v,i)=>({current:v,currentPct:v/total*100,target:total*weights[i]/100,change:total*weights[i]/100-v}))};
 }
 const api={project,fees,allocation,order,rebalance};root.ETFMath=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
