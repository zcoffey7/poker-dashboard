import Nav from "@/components/Nav";
import CashSettingsForm from "@/components/cash/CashSettingsForm";

export default function CashSettingsPage() {
  return (
    <>
      <Nav />
      <main className="p-4 md:p-6 max-w-[820px] w-full mx-auto flex flex-col gap-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Cash game settings
          </h1>
          <p className="text-sm text-muted mt-1">
            Blinds and defaults. Players can always buy in for any amount.
          </p>
        </header>
        <CashSettingsForm />
      </main>
    </>
  );
}
