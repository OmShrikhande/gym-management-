import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Wallet, Filter, Calendar, Sun, CalendarDays, CalendarRange, CalendarCheck2 } from "lucide-react";

const months = [
  "January","February","March","April","May","June","July","August","September","October","November","December"
];

const yearsAround = (centerYear) => {
  const y = Number(centerYear) || new Date().getFullYear();
  return [y - 2, y - 1, y, y + 1, y + 2];
};

const MethodButton = ({ active, onClick, icon: Icon, children }) => (
  <Button
    variant={active ? "default" : "outline"}
    className={`border-gray-600 text-gray-200 ${active ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-gray-800"}`}
    onClick={onClick}
  >
    <Icon className="h-4 w-4 mr-2" />
    {children}
  </Button>
);

const TimeButton = ({ active, onClick, icon: Icon, children }) => (
  <Button
    variant={active ? "default" : "outline"}
    className={`border-gray-600 text-gray-200 ${active ? "bg-gray-700" : "hover:bg-gray-800"}`}
    onClick={onClick}
    size="sm"
  >
    <Icon className="h-4 w-4 mr-2" />{children}
  </Button>
);

const RevenueFilters = ({ filters, onChange, onRefresh }) => {
  const yearOptions = useMemo(() => yearsAround(filters.year), [filters.year]);

  const set = (field) => (value) => onChange(field, value);

  return (
    <Card className="bg-gray-800/60 border-gray-700">
      <CardContent className="py-4 space-y-4">
        {/* Timeframe selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-400 text-xs">Timeframe:</span>
          <TimeButton active={filters.timeframe === 'daily'} onClick={() => set('timeframe')('daily')} icon={Sun}>Daily</TimeButton>
          <TimeButton active={filters.timeframe === 'weekly'} onClick={() => set('timeframe')('weekly')} icon={CalendarDays}>Weekly</TimeButton>
          <TimeButton active={filters.timeframe === 'monthly'} onClick={() => set('timeframe')('monthly')} icon={CalendarRange}>Monthly</TimeButton>
          <TimeButton active={filters.timeframe === 'yearly'} onClick={() => set('timeframe')('yearly')} icon={CalendarCheck2}>Yearly</TimeButton>
        </div>

        {/* Dynamic controls based on timeframe */}
        {filters.timeframe === 'daily' && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-60">
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <Input
                type="date"
                value={filters.refDate}
                onChange={(e) => set('refDate')(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
        )}

        {filters.timeframe === 'weekly' && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-60">
              <label className="block text-xs text-gray-400 mb-1">Week (pick any day)</label>
              <Input
                type="date"
                value={filters.refDate}
                onChange={(e) => set('refDate')(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
        )}

        {filters.timeframe === 'monthly' && (
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Month */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-400 mb-1">Month</label>
              <Select value={String(filters.month)} onValueChange={(v) => set("month")(Number(v))}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {months.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Year */}
            <div className="w-[140px]">
              <label className="block text-xs text-gray-400 mb-1">Year</label>
              <Select value={String(filters.year)} onValueChange={(v) => set("year")(Number(v))}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {filters.timeframe === 'yearly' && (
          <div className="flex gap-4 items-end">
            {/* Year only */}
            <div className="w-[140px]">
              <label className="block text-xs text-gray-400 mb-1">Year</label>
              <Select value={String(filters.year)} onValueChange={(v) => set("year")(Number(v))}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Common fields */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          {/* Plan type */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">Plan Type</label>
            <Input
              placeholder="All plans (optional)"
              value={filters.planType}
              onChange={(e) => set("planType")(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          {/* Search by member */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">Search Member</label>
            <Input
              placeholder="Name or email"
              value={filters.memberName}
              onChange={(e) => set("memberName")(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>

        <Separator className="my-2 bg-gray-700" />
      </CardContent>
    </Card>
  );
};

export default RevenueFilters;