import { useMemo, useState } from 'react'
import { ShoppingBag, Plus, Minus, CheckCircle2, UtensilsCrossed, Clock3 } from 'lucide-react'

type Category = 'tacos' | 'bebidas'
type Product = { id: string; name: string; description: string; price: number; category: Category }

const products: Product[] = [
  { id: 'chicharo-verde', name: 'Chícharo en salsa verde', description: 'Guiso tradicional de la casa', price: 7000, category: 'tacos' },
  { id: 'chicharo-roja', name: 'Chícharo en salsa roja', description: 'Con salsa roja de la casa', price: 7000, category: 'tacos' },
  { id: 'huevo', name: 'Huevo guisado', description: 'Sencillo, casero y delicioso', price: 7000, category: 'tacos' },
  { id: 'picadillo', name: 'Picadillo', description: 'Carne preparada al estilo de casa', price: 7000, category: 'tacos' },
  { id: 'papas-chorizo', name: 'Papas con chorizo', description: 'Un clásico mexicano', price: 7000, category: 'tacos' },
  { id: 'horchata', name: 'Agua de horchata', description: 'Bebida fresca', price: 5000, category: 'bebidas' },
  { id: 'jamaica', name: 'Agua de jamaica', description: 'Bebida fresca', price: 5000, category: 'bebidas' },
]

const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

export default function App() {
  const [category, setCategory] = useState<Category>('tacos')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [customer, setCustomer] = useState('')
  const [sent, setSent] = useState(false)
  const visibleProducts = products.filter((product) => product.category === category)
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
  const total = useMemo(() => products.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0), [cart])

  const changeQuantity = (id: string, amount: number) => {
    setCart((current) => {
      const next = { ...current, [id]: Math.max(0, (current[id] ?? 0) + amount) }
      if (next[id] === 0) delete next[id]
      return next
    })
  }

  const submitOrder = () => {
    if (!count || !customer.trim()) return
    // Prototipo visual: el envío real a cocina requiere conectar una base de datos y el servicio de impresión.
    setSent(true)
  }

  if (sent) {
    return <main className="success-screen"><div className="success-card"><div className="success-icon"><CheckCircle2 size={42} /></div><p className="eyebrow">XOLOTL TLAN</p><h1>¡Gracias por tu pedido!</h1><p>Tu pedido quedó registrado en esta demostración.</p><p className="muted">En la siguiente etapa conectaremos la pantalla de cocina y la impresora.</p><button className="primary-button" onClick={() => { setCart({}); setCustomer(''); setSent(false) }}>Hacer otro pedido</button></div></main>
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="brand-mark">XT</div>
        <p className="eyebrow">TRADICIÓN GASTRONÓMICA MEXICANA</p>
        <h1>XOLOTL <span>TLAN</span></h1>
        <p className="hero-subtitle">Tacos de guisado hechos con sabor de casa.</p>
        <div className="hero-rule"><span /></div>
      </header>

      <section className="menu-section">
        <div className="section-heading"><div><p className="eyebrow">NUESTRO MENÚ</p><h2>Elige tus favoritos</h2></div><span className="open-label"><span className="live-dot" /> Menú digital</span></div>
        <div className="category-tabs">
          <button className={category === 'tacos' ? 'active' : ''} onClick={() => setCategory('tacos')}><UtensilsCrossed size={17} /> Tacos de guisado</button>
          <button className={category === 'bebidas' ? 'active' : ''} onClick={() => setCategory('bebidas')}>Aguas frescas</button>
        </div>
        <div className="product-list">
          {visibleProducts.map((product) => (
            <article className="product-row" key={product.id}>
              <div className="product-symbol">{product.category === 'tacos' ? '✦' : '❋'}</div>
              <div className="product-info"><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price)}</strong></div>
              <div className="quantity-control">
                <button aria-label={`Quitar ${product.name}`} onClick={() => changeQuantity(product.id, -1)} disabled={!cart[product.id]}><Minus size={15} /></button>
                <span>{cart[product.id] ?? 0}</span>
                <button aria-label={`Agregar ${product.name}`} onClick={() => changeQuantity(product.id, 1)}><Plus size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="order-panel">
        <div className="order-title"><div><p className="eyebrow">TU ORDEN</p><h2>Resumen del pedido</h2></div><span className="bag-count"><ShoppingBag size={16} /> {count}</span></div>
        {count === 0 ? <p className="empty-cart">Agrega tus tacos y bebidas para comenzar.</p> : (
          <div className="order-lines">{products.filter((product) => cart[product.id]).map((product) => <div className="order-line" key={product.id}><span>{cart[product.id]} × {product.name}</span><strong>{money(product.price * cart[product.id])}</strong></div>)}</div>
        )}
        <div className="total-line"><span>Total</span><strong>{money(total)}</strong></div>
        <label className="customer-label" htmlFor="customer">Nombre para tu pedido</label>
        <input id="customer" value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="¿Cómo te llamas?" maxLength={60} />
        <button className="primary-button" disabled={!count || !customer.trim()} onClick={submitOrder}>Confirmar pedido <span>→</span></button>
        <p className="order-note"><Clock3 size={14} /> Tu pedido estará listo según el tiempo de preparación.</p>
      </section>
      <footer><strong>XOLOTL TLAN</strong><span>Tradición que se comparte.</span></footer>
    </main>
  )
}