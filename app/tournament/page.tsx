import DashboardClient from "@/components/DashboardClient";
import Nav from "@/components/Nav";

export default function Page() {
  return (
    <div className="flex flex-col md:h-[100dvh] md:overflow-hidden">
      <Nav />
      <div className="flex-1 md:min-h-0 md:overflow-hidden">
        <DashboardClient />
      </div>
    </div>
  );
}
