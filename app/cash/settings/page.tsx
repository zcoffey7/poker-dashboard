import Nav from "@/components/Nav";
import CashSettingsForm from "@/components/cash/CashSettingsForm";

export default function CashSettingsPage() {
  return (
    <>
      <Nav />
      <div className="p-4 md:p-6 max-w-[800px] w-full mx-auto">
        <CashSettingsForm />
      </div>
    </>
  );
}
