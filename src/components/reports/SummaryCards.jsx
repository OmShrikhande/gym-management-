import { Card, CardContent } from "@/components/ui/card";
import { Users, IndianRupee, Dumbbell, ReceiptIndianRupee } from "lucide-react";

const accentClasses = {
  blue: {
    box: "bg-blue-600/20 border border-blue-700",
    icon: "text-blue-400",
  },
  yellow: {
    box: "bg-yellow-600/20 border border-yellow-700",
    icon: "text-yellow-400",
  },
  purple: {
    box: "bg-purple-600/20 border border-purple-700",
    icon: "text-purple-400",
  },
  emerald: {
    box: "bg-emerald-600/20 border border-emerald-700",
    icon: "text-emerald-400",
  },
};

const StatCard = ({ icon: Icon, label, value, accent = "blue" }) => {
  const classes = accentClasses[accent] || accentClasses.blue;
  return (
    <Card className="bg-gray-800/60 border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${classes.box}`}>
            <Icon className={`h-6 w-6 ${classes.icon}`} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-gray-400 text-sm">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const formatINR = (n = 0) => {
  try {
    return Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  } catch {
    return `₹${Number(n || 0).toFixed(2)}`;
  }
};

const SummaryCards = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard icon={Users} label="Total Members" value={summary.members} accent="blue" />
      <StatCard icon={IndianRupee} label="Total Revenue" value={formatINR(summary.revenue)} accent="yellow" />
      <StatCard icon={ReceiptIndianRupee} label="Avg. Revenue / Member" value={formatINR(summary.avgPerMember)} accent="emerald" />
    </div>
  );
};

export default SummaryCards;