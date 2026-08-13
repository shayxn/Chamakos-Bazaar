import { PageTransition } from "@/components/page-transition";

export default function Privacy() {
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 gradient-text">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10 uppercase tracking-widest font-bold">Last updated: June 2025</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-black uppercase tracking-wider text-foreground mb-3">Information We Collect</h2>
            <p>
              When you place an order, we collect your name, phone number, and delivery address. This information is used solely to fulfil your order and communicate with you about delivery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase tracking-wider text-foreground mb-3">How We Use Your Data</h2>
            <p>
              Your personal data is used exclusively for order processing, delivery coordination via WhatsApp, and customer support. We do not sell, rent, or share your information with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase tracking-wider text-foreground mb-3">Cash on Delivery</h2>
            <p>
              FirstPick operates on a Cash on Delivery (COD) model. We do not collect or store any payment card information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase tracking-wider text-foreground mb-3">Data Retention</h2>
            <p>
              Order records are retained for up to 2 years for accounting and customer service purposes. You may request deletion of your data by contacting us via WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase tracking-wider text-foreground mb-3">Contact Us</h2>
            <p>
              For any privacy-related questions or data deletion requests, please reach out via WhatsApp at the number listed on our store.
            </p>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
