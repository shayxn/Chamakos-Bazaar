export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-10">
        <p className="text-primary font-bold uppercase tracking-[0.3em] text-sm mb-3">
          Chamak Street
        </p>
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">
          Terms of Policy
        </h1>
      </div>

      <div className="space-y-8 text-muted-foreground leading-7">
        <p>
          Welcome to Chamak Street. By placing an order on our store, you agree
          to the following Terms of Policy.
        </p>

        <section>
          <h2 className="text-2xl font-black text-foreground uppercase mb-3">
            1. Order Agreement
          </h2>
          <p>
            By purchasing from Chamak Street, you confirm that you have read and
            agreed to all policies, terms, and conditions listed below.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-foreground uppercase mb-3">
            2. Shipping & Delivery
          </h2>
          <p>
            Delivery times may vary depending on location, product availability,
            holidays, weather conditions, or courier delays. Some orders may
            arrive later than expected.
          </p>
          <p className="mt-4">By placing an order, you understand and accept that:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>Orders may be delayed</li>
            <li>Shipping times are estimates only</li>
            <li>
              Chamak Street is not responsible for unexpected courier or transit
              delays
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black text-foreground uppercase mb-3">
            3. No Refund Policy
          </h2>
          <p>All sales are final.</p>
          <p className="mt-4">Once an order has been placed:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>No refunds are allowed</li>
            <li>No cancellations are allowed</li>
            <li>No chargebacks should be attempted after purchase</li>
          </ul>
          <p className="mt-4">
            Please make sure all information, sizes, colors, and products are
            correct before checking out.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-foreground uppercase mb-3">
            4. Incorrect Information
          </h2>
          <p>Customers are responsible for entering the correct:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>Name</li>
            <li>Address</li>
            <li>Phone number</li>
            <li>Delivery details</li>
          </ul>
          <p className="mt-4">
            Chamak Street is not responsible for failed deliveries caused by
            incorrect customer information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-foreground uppercase mb-3">
            5. Product Availability
          </h2>
          <p>
            Some products may have limited stock. We reserve the right to cancel
            or limit orders if items become unavailable.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-foreground uppercase mb-3">
            6. Changes to Policy
          </h2>
          <p>
            Chamak Street may update or change these policies at any time
            without prior notice.
          </p>
        </section>

        <div className="border-t border-border pt-8">
          <p className="font-bold text-foreground">
            By ordering from Chamak Street, you automatically agree to all Terms
            of Policy listed above.
          </p>
        </div>
      </div>
    </div>
  );
}
