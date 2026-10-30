import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "@/app/actions";

export const metadata = { robots: { index: false, follow: false } };

// Seller area ka apna alag header hai.
// Buyer wala header/footer (Home, Products, Cart...) seller pages par chhupa diya jata hai.
export default async function SellerLayout({ children }) {
  const user = await getUser();
  const isSeller = user?.role === "seller";

  return (
    <>
      <style>{"body > .promo, body > header, body > footer, body > .wa { display: none; }"}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
          paddingBottom: 14,
          marginBottom: 20,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link href="/seller" className="logo">Seller<span>.</span>Panel</Link>

        {isSeller ? (
          <nav>
            <Link href="/seller">Dashboard</Link>
            <Link href="/seller/products">Products</Link>
            <Link href="/seller/orders">Orders</Link>
            <Link href="/seller/returns">Returns</Link>
            <Link href="/seller/payments">Payments</Link>
            <Link href="/seller/customers">Customers</Link>
            <Link href="/">View Shop ↗</Link>
            <form action={logout} style={{ display: "inline" }}>
              <button style={{ all: "unset", cursor: "pointer" }}>Logout</button>
            </form>
          </nav>
        ) : (
          <nav style={{ alignItems: "center" }}>
            <Link href="/seller/login">Login</Link>
            <Link href="/seller/register" className="btn a">Start Selling</Link>
          </nav>
        )}
      </div>

      {children}
    </>
  );
}
