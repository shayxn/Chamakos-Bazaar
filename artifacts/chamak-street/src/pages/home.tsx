import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const { data: featuredProducts } = useListProducts({ featured: true }, { query: { queryKey: getListProductsQueryKey({ featured: true }) } });
  
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[85vh] w-full flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/chamako-hero.png" 
            alt="Chamako mascot in streetwear" 
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        </div>
        
        <div className="container relative z-10 px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-6">
              Ignite the <br />
              <span className="gradient-text">Streets.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">
              Bold aesthetic. Unmatched drip. Dress like you own the block with the new Chamako collection.
            </p>
            <div className="flex gap-4">
              <Link href="/shop">
                <Button size="lg" className="text-lg h-14 px-8 font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground fire-gradient border-none shadow-[0_0_20px_rgba(255,102,0,0.4)]">
                  Shop Now
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-card border-y border-border/50">
        <div className="container px-4 mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-wider">The Essentials</h2>
              <p className="text-muted-foreground mt-2">Build your uniform.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Heavyweight Hoodies", image: "/product-hoodie.png", link: "/shop?category=hoodies" },
              { title: "Graphic Tees", image: "/product-tshirt.png", link: "/shop?category=tees" },
              { title: "Kicks & Headwear", image: "/product-sneakers.png", link: "/shop?category=accessories" },
            ].map((cat, i) => (
              <Link key={i} href={cat.link}>
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="group relative h-96 overflow-hidden bg-muted rounded-lg cursor-pointer"
                >
                  <img src={cat.image} alt={cat.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center">
                    <h3 className="text-2xl font-bold uppercase tracking-wider">{cat.title}</h3>
                    <div className="h-10 w-10 rounded-full bg-primary/20 backdrop-blur flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider">
              Heat <span className="text-primary">Check</span>
            </h2>
            <Link href="/shop" className="text-primary font-bold hover:underline flex items-center gap-2 uppercase text-sm tracking-widest">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts?.map((product, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                key={product.id} 
                className="group"
              >
                <Link href={`/product/${product.id}`}>
                  <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-card border border-border">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 mix-blend-lighten"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-mono">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-2">
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 uppercase tracking-wider rounded-sm">Featured</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">{product.categoryName}</p>
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
                    <p className="font-mono text-primary font-bold">${product.price.toFixed(2)}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
            
            {(!featuredProducts || featuredProducts.length === 0) && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No featured products found. Check out the shop for our full catalog.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
