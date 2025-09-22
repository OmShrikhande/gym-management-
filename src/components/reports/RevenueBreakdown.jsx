import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, CreditCard } from "lucide-react";

const formatINR = (n = 0) => {
  try { return Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }); } catch { return `₹${Number(n||0).toFixed(2)}`; }
};

const StatBox = ({ icon: Icon, label, value, colorBox, colorIcon }) => (
  <div className="flex items-center gap-4 bg-gray-800/60 p-4 rounded-lg border border-gray-700">
    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorBox}`}>
      <Icon className={`h-6 w-6 ${colorIcon}`} />
    </div>
    <div>
      <div className="text-white text-lg font-semibold">{formatINR(value)}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  </div>
);

const RevenueBreakdown = ({ cash = 0, online = 0 }) => {
  const total = Number(cash) + Number(online);
  const cashPct = total ? Math.round((Number(cash) / total) * 100) : 0;
  const onlinePct = total ? 100 - cashPct : 0;

  return (
    <Card className="bg-gray-800/60 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Revenue Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatBox icon={Wallet} label="Cash Revenue" value={cash} colorBox="bg-emerald-600/20 border border-emerald-700" colorIcon="text-emerald-400" />
          <StatBox icon={CreditCard} label="Online Revenue" value={online} colorBox="bg-blue-600/20 border border-blue-700" colorIcon="text-blue-400" />
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Cash {cashPct}%</span>
            <span>Online {onlinePct}%</span>
          </div>
          <Progress value={onlinePct} className="h-2 bg-gray-700">
          </Progress>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueBreakdown;