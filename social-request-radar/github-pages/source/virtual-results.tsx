import {useRef} from 'react';
import {useVirtualizer} from '@tanstack/react-virtual';
export default function VirtualResults({rows,card}:{rows:any[],card:(row:any)=>React.ReactNode}){
  const parent=useRef<HTMLDivElement>(null);
  const grouped=[...rows.filter(row=>row.geo?.status!=='unknown'),...rows.filter(row=>row.geo?.status==='unknown')];
  const list=useVirtualizer({count:grouped.length,getScrollElement:()=>parent.current,estimateSize:()=>460,overscan:3,getItemKey:index=>grouped[index].id});
  return <div ref={parent} className="virtual-results" role="region" aria-label="قائمة نتائج قابلة للتمرير" tabIndex={0}>
    <div style={{height:list.getTotalSize(),position:'relative',width:'100%'}}>{list.getVirtualItems().map(item=><div key={item.key} data-index={item.index} ref={list.measureElement} style={{position:'absolute',top:0,insetInlineStart:0,width:'100%',transform:`translateY(${item.start}px)`,paddingBottom:16}}>
      {grouped[item.index].geo?.status==='unknown'&&(item.index===0||grouped[item.index-1].geo?.status!=='unknown')&&<h3 className="subheading">الدولة غير واضحة — تحتاج مراجعة</h3>}
      {card(grouped[item.index])}
    </div>)}</div>
  </div>;
}
