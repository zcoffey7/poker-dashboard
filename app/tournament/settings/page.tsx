import Nav from "@/components/Nav";
import SettingsForm from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <>
      <Nav />
      <main className="p-4 md:p-6 max-w-[1200px] w-full mx-auto flex flex-col gap-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tournament settings
          </h1>
          <p className="text-sm text-muted mt-1">
            Pricing, tables, payouts, chips, and the blind structure.
          </p>
        </header>
        <SettingsForm />
      </main>
    </>
  );
}
