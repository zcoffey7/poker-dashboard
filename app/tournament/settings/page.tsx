import Nav from "@/components/Nav";
import SettingsForm from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <>
      <Nav />
      <div className="p-4 md:p-6 max-w-[1200px] w-full mx-auto">
        <SettingsForm />
      </div>
    </>
  );
}
