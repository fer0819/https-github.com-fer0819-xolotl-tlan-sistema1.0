import { useMemo, useState } from 'react'
import { Bell, ChefHat, ClipboardList, Clock3, Plus, Search, ShoppingBag, Utensils, X } from 'lucide-react'

type Dish = { id: number; name: string; description: string; price: number; category: string; available: boolean }
type OrderItem = { dish: Dish; quantity: number }
type Order = { id: number; customer: string; items: OrderItem[]; status: 'Nuevo' | 'En preparación' | 'Listo'; createdAt: string }

const initialDishes: Dish[] = [
  { id: 1, name: 'Chícharo en salsa verde', description: 'Guiso casero, suave y lleno de sabor.', price: 7000, category: 'Guisos', available: true },
  { id: 2, name: 'Chícharo en salsa roja', description: 'Receta tradicional con salsa de la casa.', price: 7000, category: 'Guisos', available: true },
  { id: 3, name: 'Huevo', description: 'Huevo guisado al estilo de la casa.', price: 7000, category: 'Guisos', available: true },
  { id: 4, name: 'Picadillo', description: 'Carne molida con verduras y sazón casera.', price: 7000, category: 'Guisos', available: true },
  { id: 5, name: 'Papas con chorizo', description: 'Papas doraditas con chorizo.', price: 7000, category: 'Guisos', available: true },
  { id: 6, name: 'Agua de horchata', description: 'Agua fresca preparada en casa.', price: 5000, category: 'Bebidas', available: true },
  { id: 7, name: 'Agua de jamaica', description: 'Agua fresca de jamaica natural.', price: 5000, category: 'Bebidas', available: true },
]
const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

export default function App() {
  const [section, setSection] = useState<'Pedidos' | 'Menú' | 'Cocina'>('Pedidos')
  const [dishes, setDishes] = useState(initialDishes)
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<OrderItem[]>([])
  const [customer, setCustomer] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [category, setCategory] = useState('Todos')
  const total = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  const filtered = useMemo(() => dishes.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) && (category === 'Todos' || d.category === category)), [dishes, search, category])
  const addToCart = (dish: Dish) => setCart(current => {
    const found = current.find(item => item.dish.id === dish.id)
    return found ? current.map(item => item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { dish, quantity: 1 }]
  })
  const createOrder = () => {
    if (!cart.length) return
    const order: Order = { id: Date.now(), customer: customer.trim() || 'Cliente mostrador', items: cart, status: 'Nuevo', createdAt: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) }
    setOrders(current => [order, ...current])
    setCart([])
    setCustomer('')
    setShowCart(false)
    setSection('Cocina')
  }
  const advanceOrder = (id: number) => setOrders(current => current.map(order => order.id === id ? { ...order, status: order.status === 'Nuevo' ? 'En preparación' : 'Listo' } : order))
  const toggleDish = (id: number) => setDishes(current => current.map(dish => dish.id === id ? { ...dish, available: !dish.available } : dish))

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark">XT</div>
      <div className="brand-name">XOLOTL <span>TLAN</span></div>
      <p className="brand-caption">TRADICIÓN · SABOR · SERVICIO</p>
      <div className="side-label">OPERACIÓN</div>
      {(['Pedidos', 'Menú', 'Cocina'] as const).map((item) => <button key={item} className={section === item ? 'nav-item active' : 'nav-item'} onClick={() => setSection(item)}>{item === 'Pedidos' ? <ClipboardList size={18}/> : item === 'Menú' ? <Utensils size={18}/> : <ChefHat size={18}/>}<span>{item}</span>{item === 'Cocina' && orders.filter(o => o.status !== 'Listo').length > 0 && <b>{orders.filter(o => o.status !== 'Listo').length}</b>}</button>)}
      <div className="sidebar-bottom"><div className="status-dot"/> Sistema de demostración <small>Versión inicial 0.1</small></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><span className="eyebrow">XOLOTL TLAN / PANEL DE CONTROL</span><h1>{section === 'Pedidos' ? 'Gestión de pedidos' : section === 'Menú' ? 'Menú y disponibilidad' : 'Pantalla de cocina'}</h1></div><div className="top-actions"><span className="open-pill"><i/> Servicio activo</span><button className="icon-button" aria-label="Notificaciones"><Bell size={19}/></button><div className="avatar">XT</div></div></header>
      {section === 'Pedidos' && <><div className="welcome-row"><div><h2>Prepara algo delicioso.</h2><p>Registra pedidos y envíalos directamente a cocina.</p></div><button className="primary-button" onClick={() => setShowCart(true)}><Plus size={17}/> Nuevo pedido</button></div>
        <div className="stats-grid"><Stat icon={<ClipboardList/>} label="Pedidos de hoy" value={String(orders.length)} hint="En esta sesión"/><Stat icon={<Clock3/>} label="Por preparar" value={String(orders.filter(o => o.status !== 'Listo').length)} hint="Pendientes de entrega"/><Stat icon={<ShoppingBag/>} label="Ventas registradas" value={money(orders.reduce((sum,o)=>sum+o.items.reduce((s,i)=>s+i.dish.price*i.quantity,0),0))} hint="Total de esta sesión"/></div>
        <section className="panel"><div className="panel-heading"><div><h3>Pedidos recientes</h3><p>Seguimiento de los pedidos recibidos</p></div><button className="text-button" onClick={() => setSection('Cocina')}>Ver cocina <span>→</span></button></div>
          {orders.length === 0 ? <Empty icon={<ClipboardList size={25}/>} title="Todavía no hay pedidos" text="Crea un pedido de prueba para verlo aparecer aquí y en cocina."/> : <div className="order-list">{orders.map(order => <OrderRow key={order.id} order={order} onAdvance={advanceOrder}/>)}</div>}
        </section>
      </>}
      {section === 'Menú' && <><div className="welcome-row"><div><h2>Productos del día</h2><p>Administra los guisos, bebidas y su disponibilidad.</p></div><span className="count-label">{dishes.length} productos</span></div><div className="menu-grid">{dishes.map(d => <article className="dish-card" key={d.id}><div className="dish-illustration"><Utensils size={25}/></div><div className="dish-info"><span className="category-tag">{d.category}</span><h3>{d.name}</h3><p>{d.description}</p><strong>{money(d.price)}</strong></div><button className={d.available ? 'availability on' : 'availability off'} onClick={() => toggleDish(d.id)}>{d.available ? 'Disponible' : 'Agotado'}</button></article>)}</div></>}
      {section === 'Cocina' && <><div className="welcome-row"><div><h2>Comandas en tiempo real</h2><p>Avanza cada pedido conforme sale de cocina.</p></div><span className="count-label">{orders.filter(o => o.status !== 'Listo').length} pendientes</span></div>{orders.length === 0 ? <Empty icon={<ChefHat size={25}/>} title="La cocina está lista" text="Cuando registres un pedido, aparecerá aquí para su preparación."/> : <div className="kitchen-grid">{orders.map(order => <article className="kitchen-card" key={order.id}><div className="kitchen-head"><div><span className="order-number">PEDIDO #{String(order.id).slice(-4)}</span><h3>{order.customer}</h3></div><span className={'status '+(order.status === 'Listo' ? 'ready' : order.status === 'Nuevo' ? 'new' : 'prep')}>{order.status}</span></div><div className="kitchen-items">{order.items.map(item => <div key={item.dish.id}><b>{item.quantity}×</b> {item.dish.name}</div>)}</div><div className="kitchen-foot"><span><Clock3 size={14}/> {order.createdAt}</span><button className="primary-button small" onClick={() => advanceOrder(order.id)} disabled={order.status === 'Listo'}>{order.status === 'Nuevo' ? 'Comenzar preparación' : order.status === 'En preparación' ? 'Marcar como listo' : 'Pedido entregado'}</button></div></article>)}</div>}</>}
      <footer>XOLOTL TLAN <span>·</span> Tradición gastronómica mexicana, innovación empresarial y crecimiento sostenible.</footer>
    </main>
    {showCart && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowCart(false) }}><section className="order-modal"><div className="modal-head"><div><span className="eyebrow">VENTA / MOSTRADOR</span><h2>Crear pedido</h2></div><button className="icon-button" onClick={() => setShowCart(false)}><X size={20}/></button></div><label className="field-label">Nombre del cliente (opcional)<input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Ej. Cliente 01"/></label><div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en el menú..."/></div><div className="category-tabs">{['Todos','Guisos','Bebidas'].map(c => <button key={c} className={category===c?'selected':''} onClick={() => setCategory(c)}>{c}</button>)}</div><div className="product-picker">{filtered.filter(d=>d.available).map(d => <div className="picker-row" key={d.id}><div><b>{d.name}</b><small>{money(d.price)}</small></div><button onClick={() => addToCart(d)}><Plus size={16}/></button></div>)}</div><div className="cart-summary"><div className="cart-lines">{cart.length ? cart.map(i=><span key={i.dish.id}>{i.quantity} × {i.dish.name}</span>) : <span>Agrega productos para comenzar</span>}</div><div className="total-line"><b>Total</b><strong>{money(total)}</strong></div><button className="primary-button checkout" disabled={!cart.length} onClick={createOrder}>Enviar pedido a cocina <span>→</span></button></div></section></div>}
  </div>
}

function Stat({icon,label,value,hint}:{icon:React.ReactNode;label:string;value:string;hint:string}) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{hint}</small></div> }
function Empty({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="empty-state"><div>{icon}</div><h3>{title}</h3><p>{text}</p></div> }
function OrderRow({order,onAdvance}:{order:Order;onAdvance:(id:number)=>void}) { return <div className="order-row"><div className="order-icon"><ShoppingBag size={18}/></div><div className="order-main"><b>{order.customer}</b><small>{order.items.reduce((s,i)=>s+i.quantity,0)} artículos · {order.createdAt}</small></div><span className={'status '+(order.status==='Listo'?'ready':order.status==='Nuevo'?'new':'prep')}>{order.status}</span><strong>{money(order.items.reduce((s,i)=>s+i.quantity*i.dish.price,0))}</strong><button className="row-action" onClick={()=>onAdvance(order.id)} aria-label="Avanzar pedido">→</button></div> }
