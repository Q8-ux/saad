'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Page(){
  useEffect(()=>{
    const timer=window.setTimeout(()=>window.location.replace('./dashboard/'),250);
    return ()=>window.clearTimeout(timer);
  },[]);
  return <main><div className="card"><h1>منصة نطاق العمل</h1><p className="muted">جارٍ فتح لوحة التحكم...</p><Link className="linkButton" href="/dashboard">فتح لوحة التحكم</Link></div></main>;
}
