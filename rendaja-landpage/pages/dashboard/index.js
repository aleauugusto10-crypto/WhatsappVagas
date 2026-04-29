
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Dashboard(){
  const [data,setData]=useState({
    slug:"",
    nome:"",
    servico:"",
    cidade:"",
    descricao:"",
    whatsapp:"",
  });

  async function salvar(){
    await supabase.from("profiles_pages").upsert(data);
    alert("Salvo!");
  }

  return(
    <div className="container">
      <h1>Dashboard</h1>
      {Object.keys(data).map(k=>(
        <input key={k}
          placeholder={k}
          value={data[k]}
          onChange={e=>setData({...data,[k]:e.target.value})}
          style={{display:"block",margin:"10px 0",padding:"10px"}}
        />
      ))}
      <button className="btn" onClick={salvar}>Salvar</button>
    </div>
  );
}
