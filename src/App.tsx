import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChefHat, ClipboardList, Clock3, Plus, Search, ShoppingBag, Utensils, X, RefreshCw, Database } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Dish = { id: string; name: string; description: string; price: number; category: string; available: boolean }
type OrderItem = { id: string; name: string; quantity: number; unitPrice: number }
type Order = { id: string; number: number; customer: string; items: OrderItem[]; status: 'Nuevo' | 'En preparación' | 'Listo' | 'Entregado'; createdAt: string; total: number }
const demoDishes: Dish[] = [
  {id:'demo-1',name:'Chícharo en salsa verde',description:'Guiso casero, suave y lleno de sabor.',price:7000,category:'Guisos',available:true},
  {id:'demo-2',name:'Chícharo en salsa roja',description:'Receta tradicional con salsa de la casa.',price:7000,category:'Guisos',available:true},
  {id:'demo-3',name:'Huevo',description:'Huevo guisado al estilo de la casa.',price:7000,category:'Guisos',available:true},
  {id:'demo-4',name:'Picadillo',description:'Carne molida con verduras y sazón casera.',price:7000,category:'Guisos',available:true},
  {id:'demo-5',name:'Papas con chorizo',description:'Papas doraditas con chorizo.',price:7000,category:'Guisos',available:true},
  {id:'demo-6',name:'Agua de horchata',description:'Agua fresca preparada en casa.',price:5000,category:'Bebidas',available:true},
  {id:'demo-7',name:'Agua de jamaica',description:'Agua fresca de jamaica natural.',price:5000,category:'Bebidas',available:true},
]
const money = (value:number) => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value)
const statusLabel = (value:string):Order['status'] => value === 'en_preparacion' ? 'En preparación' : value === 'listo' ? 'Listo' : value === 'entregado' ? 'Entregado' : 'Nuevo'
const statusValue = (value:Order['status']) => value === 'En preparación' ? 'en_preparacion' : value.toLowerCase()

export default function App() {
  const [section,setSection] = useState<'Pedidos'|'Menú'|'Cocina'>('Pedidos')
  const [dishes,setDishes] = useState<Dish[]>(demoDishes)
  const [orders,setOrders] = useState<Order[]>([])
  const [search,setSearch] = useState('')
  const [cart,setCart] = useState<{dish:Dish;quantity:number}[]>([])
  const [customer,setCustomer] = useState('')
  const [showCart,setShowCart] = useState(false)
  const [category,setCategory] = useState('Todos')
  const [loading,setLoading] = useState(isSupabaseConfigured)
  const [saving,setSaving] = useState(false)
  const [connectionError,setConnectionError] = useState('')
  const [notice,setNotice] = useState('')
  const [session,setSession] = useState<any>(null)
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [authBusy,setAuthBusy] = useState(false)
  const [authError,setAuthError] = useState('')
  const total = cart.reduce((sum,item)=>sum+item.dish.price*item.quantity,0)
  const filtered = useMemo(()=>dishes.filter(d=>d.name.toLowerCase().includes(search.toLowerCase())&&(category==='Todos'||d.category===category)),[dishes,search,category])

  const loadMenu = useCallback(async()=>{
    if(!supabase) return
    const {data,error} = await supabase.from('menu_items').select('id,name,description,price_cop,is_available,menu_categories(name)').order('sort_order')
    if(error) throw error
    setDishes((data ?? []).map((row:any)=>({id:row.id,name:row.name,description:row.description,price:row.price_cop,category:row.menu_categories?.name ?? 'Menú',available:row.is_available})))
  },[])

  const loadOrders = useCallback(async()=>{
    if(!supabase) return
    const {data,error} = await supabase.from('orders').select('id,order_number,customer_name,status,created_at,subtotal_cop,order_items(id,item_name,unit_price_cop,quantity)').order('created_at',{ascending:false}).limit(100)
    if(error) throw error
    setOrders((data ?? []).map((row:any)=>({id:row.id,number:row.order_number,customer:row.customer_name,items:(row.order_items ?? []).map((item:any)=>({id:item.id,name:item.item_name,quantity:item.quantity,unitPrice:item.unit_price_cop})),status:statusLabel(row.status),createdAt:new Date(row.created_at).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}),total:row.subtotal_cop})))
  },[])

  const refresh = useCallback(async()=>{
    if(!supabase) return
    setLoading(true)
    try { await Promise.all([loadMenu(),loadOrders()]); setConnectionError('') }
    catch(error) { setConnectionError(error instanceof Error ? error.message : 'No se pudo consultar Supabase.') }
    finally { setLoading(false) }
  },[loadMenu,loadOrders])

  useEffect(()=>{
    if(!supabase) return
    void supabase.auth.getSession().then(({data})=>setSession(data.session))
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,nextSession)=>setSession(nextSession))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    const client = supabase
    if(!client || !session) return
    void refresh()
    const channel = client.channel('xolotl-orders-live').on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>{void loadOrders()}).subscribe()
    return ()=>{void client.removeChannel(channel)}
  },[refresh,loadOrders,session])

  const signIn=async(e:React.FormEvent)=>{
    e.preventDefault(); if(!supabase) return
    setAuthBusy(true);setAuthError('')
    const {error}=await supabase.auth.signInWithPassword({email,password})
    if(error) setAuthError(error.message)
    setAuthBusy(false)
  }
  const addToCart=(dish:Dish)=>setCart(current=>{
    const found=current.find(item=>item.dish.id===dish.id)
    return found?current.map(item=>item.dish.id===dish.id?{...item,quantity:item.quantity+1}:item):[...current,{dish,quantity:1}]
  })

  const createOrder=async()=>{
    if(!cart.length) return
    setSaving(true); setNotice('')
    try {
      if(supabase && isSupabaseConfigured) {
        const {error}=await supabase.rpc('submit_public_order',{p_customer_name:customer.trim()||'Cliente mostrador',p_items:cart.map(item=>({menu_item_id:item.dish.id,quantity:item.quantity})),p_channel:'mostrador',p_table_label:null,p_notes:''})
        if(error) throw error
        await loadOrders()
      } else {
        const order:Order={id:String(Date.now()),number:orders.length+1,customer:customer.trim()||'Cliente mostrador',items:cart.map(item=>({id:item.dish.id,name:item.dish.name,quantity:item.quantity,unitPrice:item.dish.price})),status:'Nuevo',createdAt:new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}),total}
        setOrders(current=>[order,...current])
      }
      setCart([]);setCustomer('');setShowCart(false);setSection('Cocina')
      setNotice('Pedido registrado correctamente.')
    } catch(error) { setNotice(error instanceof Error?error.message:'No se pudo registrar el pedido.') }
    finally { setSaving(false) }
  }

  const advanceOrder=async(order:Order)=>{
    const next:Order['status']=order.status==='Nuevo'?'En preparación':order.status==='En preparación'?'Listo':'Entregado'
    if(supabase && isSupabaseConfigured) {
      const {error}=await supabase.from('orders').update({status:statusValue(next),updated_at:new Date().toISOString()}).eq('id',order.id)
      if(error){setNotice(error.message);return}
      await loadOrders()
    } else setOrders(current=>current.map(item=>item.id===order.id?{...item,status:next}:item))
  }

  if(isSupabaseConfigured && !session) return <div className="login-screen"><form className="login-card" onSubmit={signIn}><div className="brand-mark">XT</div><div className="brand-name">XOLOTL <span>TLAN</span></div><p className="brand-caption">ACCESO DEL PERSONAL</p><h1>Bienvenido</h1><p>Inicia sesión para consultar pedidos y cocina.</p><label className="field-label">Correo electrónico<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@xolotltlan.com"/></label><label className="field-label">Contraseña<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tu contraseña"/></label>{authError&&<div className="connection-banner error">{authError}</div>}<button className="primary-button checkout" disabled={authBusy}>{authBusy?'Ingresando…':'Iniciar sesión'}</button><small>El administrador debe crear tu usuario en Supabase.</small></form></div>

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand-mark">XT</div><div className="brand-name">XOLOTL <span>TLAN</span></div><p className="brand-caption">TRADICIÓN · SABOR · SERVICIO</p><div className="side-label">OPERACIÓN</div>
      {(['Pedidos','Menú','Cocina'] as const).map(item=><button key={item} className={section===item?'nav-item active':'nav-item'} onClick={()=>setSection(item)}>{item==='Pedidos'?<ClipboardList size={18}/>:item==='Menú'?<Utensils size={18}/>:<ChefHat size={18}/>}<span>{item}</span>{item==='Cocina'&&orders.filter(o=>o.status!=='Listo'&&o.status!=='Entregado').length>0&&<b>{orders.filter(o=>o.status!=='Listo'&&o.status!=='Entregado').length}</b>}</button>)}
      <div className="sidebar-bottom"><div className="status-dot"/>{isSupabaseConfigured?'Base de datos configurada':'Modo demostración'}<small>XOLOTL TLAN · v0.2</small></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><span className="eyebrow">XOLOTL TLAN / PANEL DE CONTROL</span><h1>{section==='Pedidos'?'Gestión de pedidos':section==='Menú'?'Menú y disponibilidad':'Pantalla de cocina'}</h1></div><div className="top-actions"><span className="open-pill"><i/>{isSupabaseConfigured?'Conexión configurada':'Vista previa'}</span><button className="icon-button" aria-label="Actualizar" onClick={()=>void refresh()}><RefreshCw size={18}/></button><button className="avatar avatar-button" title="Cerrar sesión" onClick={()=>void supabase?.auth.signOut()}>XT</button></div></header>
      {!isSupabaseConfigured&&<div className="connection-banner"><Database size={17}/><span>La base de datos aún no está conectada. Estás viendo el modo de demostración; los pedidos no se guardan permanentemente.</span></div>}
      {connectionError&&<div className="connection-banner error"><Database size={17}/><span>No se pudo conectar: {connectionError}</span></div>}
      {notice&&<div className="connection-banner"><span>{notice}</span><button className="text-button" onClick={()=>setNotice('')}>Cerrar</button></div>}
      {section==='Pedidos'&&<><div className="welcome-row"><div><h2>Prepara algo delicioso.</h2><p>Registra pedidos y envíalos directamente a cocina.</p></div><button className="primary-button" onClick={()=>{setShowCart(true);setSearch('');setCategory('Todos')}}><Plus size={17}/> Nuevo pedido</button></div>
        <div className="stats-grid"><Stat icon={<ClipboardList/>} label="Pedidos cargados" value={String(orders.length)} hint={isSupabaseConfigured?'Últimos 100 pedidos':'En esta sesión'}/><Stat icon={<Clock3/>} label="Por preparar" value={String(orders.filter(o=>o.status!=='Listo'&&o.status!=='Entregado').length)} hint="Pendientes de entrega"/><Stat icon={<ShoppingBag/>} label="Ventas registradas" value={money(orders.reduce((sum,o)=>sum+o.total,0))} hint="Pedidos cargados"/></div>
        <section className="panel"><div className="panel-heading"><div><h3>Pedidos recientes</h3><p>Seguimiento de los pedidos recibidos</p></div><button className="text-button" onClick={()=>setSection('Cocina')}>Ver cocina <span>→</span></button></div>
          {loading?<Empty icon={<RefreshCw size={25}/>} title="Cargando pedidos" text="Consultando la base de datos."/>:orders.length===0?<Empty icon={<ClipboardList size={25}/>} title="Todavía no hay pedidos" text="Crea un pedido para verlo aparecer aquí y en cocina."/>:<div className="order-list">{orders.map(order=><OrderRow key={order.id} order={order} onAdvance={()=>void advanceOrder(order)}/>)}</div>}
        </section>
      </>}
      {section==='Menú'&&<><div className="welcome-row"><div><h2>Productos del día</h2><p>Consulta los guisos, bebidas y su disponibilidad.</p></div><span className="count-label">{dishes.length} productos</span></div><div className="menu-grid">{dishes.map(d=><article className="dish-card" key={d.id}><div className="dish-illustration"><Utensils size={25}/></div><div className="dish-info"><span className="category-tag">{d.category}</span><h3>{d.name}</h3><p>{d.description}</p><strong>{money(d.price)}</strong></div><span className={d.available?'availability on':'availability off'}>{d.available?'Disponible':'Agotado'}</span></article>)}</div></>}
      {section==='Cocina'&&<><div className="welcome-row"><div><h2>Comandas en tiempo real</h2><p>Avanza cada pedido conforme sale de cocina.</p></div><span className="count-label">{orders.filter(o=>o.status!=='Listo'&&o.status!=='Entregado').length} pendientes</span></div>{orders.length===0?<Empty icon={<ChefHat size={25}/>} title="La cocina está lista" text="Cuando registres un pedido, aparecerá aquí para su preparación."/>:<div className="kitchen-grid">{orders.map(order=><article className="kitchen-card" key={order.id}><div className="kitchen-head"><div><span className="order-number">PEDIDO #{String(order.number).padStart(4,'0')}</span><h3>{order.customer}</h3></div><span className={'status '+(order.status==='Listo'||order.status==='Entregado'?'ready':order.status==='Nuevo'?'new':'prep')}>{order.status}</span></div><div className="kitchen-items">{order.items.map(item=><div key={item.id}><b>{item.quantity}×</b> {item.name}</div>)}</div><div className="kitchen-foot"><span><Clock3 size={14}/> {order.createdAt}</span><button className="primary-button small" onClick={()=>void advanceOrder(order)} disabled={order.status==='Entregado'||order.status==='Listo'}>{order.status==='Nuevo'?'Comenzar preparación':order.status==='En preparación'?'Marcar como listo':'Pedido finalizado'}</button></div></article>)}</div>}</>}
      <footer>XOLOTL TLAN <span>·</span> Tradición gastronómica mexicana, innovación empresarial y crecimiento sostenible.</footer>
    </main>
    {showCart&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowCart(false)}}><section className="order-modal"><div className="modal-head"><div><span className="eyebrow">VENTA / MOSTRADOR</span><h2>Crear pedido</h2></div><button className="icon-button" onClick={()=>setShowCart(false)}><X size={20}/></button></div><label className="field-label">Nombre del cliente (opcional)<input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Ej. Cliente 01"/></label><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar en el menú..."/></div><div className="category-tabs">{['Todos','Guisos','Bebidas'].map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="product-picker">{filtered.filter(d=>d.available).map(d=><div className="picker-row" key={d.id}><div><b>{d.name}</b><small>{money(d.price)}</small></div><button onClick={()=>addToCart(d)}><Plus size={16}/></button></div>)}</div><div className="cart-summary"><div className="cart-lines">{cart.length?cart.map(i=><span key={i.dish.id}>{i.quantity} × {i.dish.name}</span>):<span>Agrega productos para comenzar</span>}</div><div className="total-line"><b>Total estimado</b><strong>{money(total)}</strong></div><button className="primary-button checkout" disabled={!cart.length||saving} onClick={()=>void createOrder()}>{saving?'Guardando pedido…':'Enviar pedido a cocina'} <span>→</span></button></div></section></div>}
  </div>
}

function Stat({icon,label,value,hint}:{icon:React.ReactNode;label:string;value:string;hint:string}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{hint}</small></div>}
function Empty({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="empty-state"><div>{icon}</div><h3>{title}</h3><p>{text}</p></div>}
function OrderRow({order,onAdvance}:{order:Order;onAdvance:()=>void}){return <div className="order-row"><div className="order-icon"><ShoppingBag size={18}/></div><div className="order-main"><b>{order.customer}</b><small>{order.items.reduce((s,i)=>s+i.quantity,0)} artículos · {order.createdAt}</small></div><span className={'status '+(order.status==='Listo'||order.status==='Entregado'?'ready':order.status==='Nuevo'?'new':'prep')}>{order.status}</span><strong>{money(order.total)}</strong><button className="row-action" onClick={onAdvance} aria-label="Avanzar pedido">→</button></div>}
