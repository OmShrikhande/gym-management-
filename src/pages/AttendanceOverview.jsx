import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Calendar, Users, User, Filter, Loader2, ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const AttendanceOverview = () => {
  const { authFetch, users, isGymOwner } = useAuth();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, members, trainers
  const [isLoading, setIsLoading] = useState(true);
  const [memberAttendanceStats, setMemberAttendanceStats] = useState({});
  const [trainerAttendanceStats, setTrainerAttendanceStats] = useState({});
  const [combinedData, setCombinedData] = useState([]);

  useEffect(() => {
    if (isGymOwner && users.length > 0) {
      fetchAllAttendanceData();
    }
  }, [isGymOwner, users]);

  const fetchAllAttendanceData = async () => {
    setIsLoading(true);
    try {
      // Fetch member attendance stats
      const memberResponse = await authFetch('/attendance/gym/stats');
      if (memberResponse.success || memberResponse.status === 'success') {
        setMemberAttendanceStats(memberResponse.data?.summary || {});
      }

      // Fetch trainer attendance stats
      const trainerResponse = await authFetch('/attendance/trainers/stats');
      if (trainerResponse.success || trainerResponse.status === 'success') {
        setTrainerAttendanceStats(trainerResponse.data?.summary || {});
      }

      // Process users data to create combined attendance view only if users exist
      if (users && users.length > 0) {
        processCombinedData();
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processCombinedData = () => {
    const combined = [];
    
    // Add members with their attendance
    const members = users.filter(user => user.role === 'member');
    members.forEach(member => {
      const attendance = member.attendance || [];
      const today = new Date();
      const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const todayCount = attendance.filter(record => {
        const recordDate = new Date(record.timestamp);
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const recordStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
        return recordStart.getTime() === todayStart.getTime();
      }).length;

      const weekCount = attendance.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= thisWeek;
      }).length;

      const monthCount = attendance.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= thisMonth;
      }).length;

      combined.push({
        id: member._id,
        name: member.name,
        email: member.email,
        type: 'Member',
        todayAttendance: todayCount,
        weekAttendance: weekCount,
        monthAttendance: monthCount,
        totalAttendance: attendance.length,
        lastAttendance: attendance.length > 0 ? 
          new Date(Math.max(...attendance.map(a => new Date(a.timestamp)))).toLocaleDateString() : 
          'Never',
        status: member.membershipStatus || 'Active'
      });
    });

    // Add trainers with their attendance
    const trainers = users.filter(user => user.role === 'trainer');
    trainers.forEach(trainer => {
      const attendance = trainer.attendance || [];
      const today = new Date();
      const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const todayCount = attendance.filter(record => {
        const recordDate = new Date(record.timestamp);
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const recordStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
        return recordStart.getTime() === todayStart.getTime();
      }).length;

      const weekCount = attendance.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= thisWeek;
      }).length;

      const monthCount = attendance.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= thisMonth;
      }).length;

      combined.push({
        id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        type: 'Trainer',
        todayAttendance: todayCount,
        weekAttendance: weekCount,
        monthAttendance: monthCount,
        totalAttendance: attendance.length,
        lastAttendance: attendance.length > 0 ? 
          new Date(Math.max(...attendance.map(a => new Date(a.timestamp)))).toLocaleDateString() : 
          'Never',
        status: trainer.status || 'Active'
      });
    });

    setCombinedData(combined);
  };

  const filteredData = combinedData.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || 
                       (filterType === "members" && person.type === "Member") ||
                       (filterType === "trainers" && person.type === "Trainer");
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type) => {
    return type === 'Member' ? 'bg-blue-500' : 'bg-green-500';
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? 'default' : 'destructive';
  };

  if (!isGymOwner) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400">Only gym owners can view attendance overview.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading attendance data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Attendance Overview</h1>
            <p className="text-gray-400">View and manage member and trainer attendance</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-400">Members Today</p>
                  <p className="text-2xl font-bold text-white">{memberAttendanceStats.totalAttendanceToday || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-400">Trainers Today</p>
                  <p className="text-2xl font-bold text-white">{trainerAttendanceStats.totalAttendanceToday || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-400">This Week</p>
                  <p className="text-2xl font-bold text-white">
                    {(memberAttendanceStats.totalAttendanceThisWeek || 0) + (trainerAttendanceStats.totalAttendanceThisWeek || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-400">This Month</p>
                  <p className="text-2xl font-bold text-white">
                    {(memberAttendanceStats.totalAttendanceThisMonth || 0) + (trainerAttendanceStats.totalAttendanceThisMonth || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Filter & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  onClick={() => setFilterType("all")}
                  className="border-gray-600"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  All ({combinedData.length})
                </Button>
                <Button
                  variant={filterType === "members" ? "default" : "outline"}
                  onClick={() => setFilterType("members")}
                  className="border-gray-600"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Members ({combinedData.filter(p => p.type === 'Member').length})
                </Button>
                <Button
                  variant={filterType === "trainers" ? "default" : "outline"}
                  onClick={() => setFilterType("trainers")}
                  className="border-gray-600"
                >
                  <User className="h-4 w-4 mr-2" />
                  Trainers ({combinedData.filter(p => p.type === 'Trainer').length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Detailed Attendance</CardTitle>
            <CardDescription className="text-gray-400">
              Individual attendance records for all members and trainers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No attendance data found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Name</TableHead>
                    <TableHead className="text-gray-300">Email</TableHead>
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Today</TableHead>
                    <TableHead className="text-gray-300">This Week</TableHead>
                    <TableHead className="text-gray-300">This Month</TableHead>
                    <TableHead className="text-gray-300">Total</TableHead>
                    <TableHead className="text-gray-300">Last Visit</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((person) => (
                    <TableRow key={person.id} className="border-gray-700">
                      <TableCell className="text-white font-medium">
                        {person.name}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {person.email}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${getTypeColor(person.type)} text-white`}
                        >
                          {person.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">
                        {person.todayAttendance}
                      </TableCell>
                      <TableCell className="text-white">
                        {person.weekAttendance}
                      </TableCell>
                      <TableCell className="text-white">
                        {person.monthAttendance}
                      </TableCell>
                      <TableCell className="text-white">
                        {person.totalAttendance}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {person.lastAttendance}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(person.status)}>
                          {person.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceOverview;