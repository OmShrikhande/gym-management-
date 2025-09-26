import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Calendar, Clock, Dumbbell, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MembershipCard = ({ 
  user, 
  membershipData, 
  membershipExpired, 
  setShowTrainerSelection 
}) => {
  const navigate = useNavigate();

  if (user?.role !== 'member') return null;

  return (
    <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-600">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Membership Status
        </CardTitle>
        <CardDescription className="text-blue-200">
          Your current membership details and trainer information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Membership Type and Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 mb-1">Membership Type</p>
              <div className="flex items-center gap-2">
                <UIBadge variant="secondary" className="bg-blue-600/20 text-blue-100 border-blue-500">
                  {membershipData.type}
                </UIBadge>
                <UIBadge 
                  variant={membershipExpired ? "destructive" : "default"}
                  className={membershipExpired ? 
                    "bg-red-600/20 text-red-100 border-red-500" : 
                    "bg-green-600/20 text-green-100 border-green-500"
                  }
                >
                  {membershipData.status}
                </UIBadge>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-blue-200 mb-1">Status</p>
              {membershipExpired ? (
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <p className="text-red-400 font-medium">Expired</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/billing-plans')}
                    className="mt-2 bg-red-600/20 hover:bg-red-600/30 border-red-500 text-red-100"
                  >
                    Renew Now
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      membershipData.daysRemaining > 30 ? 'bg-green-400' : 
                      membershipData.daysRemaining > 10 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}></div>
                    <p className={`font-medium ${
                      membershipData.daysRemaining > 30 ? 'text-green-400' : 
                      membershipData.daysRemaining > 10 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      Active ({membershipData.daysRemaining} days remaining)
                    </p>
                  </div>
                  
                  {membershipData.daysRemaining < 30 && (
                    <div className="mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/billing-plans')}
                        className={`
                          ${membershipData.daysRemaining <= 10 ? 
                            'bg-red-600/20 hover:bg-red-600/30 border-red-500 text-red-100' : 
                            'bg-yellow-600/20 hover:bg-yellow-600/30 border-yellow-500 text-yellow-100'}
                        `}
                      >
                        Renew Membership
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Trainer Information */}
          <div className="mt-4 pt-4 border-t border-blue-600">
            <p className="text-blue-200 mb-1">Assigned Trainer</p>
            {membershipData.assignedTrainer ? (
              <div>
                <p className="text-white font-medium">{membershipData.trainerName || 'Not assigned'}</p>
                <p className="text-blue-200 text-sm mt-1">Your trainer has assigned workout and diet plans for you</p>
              </div>
            ) : (
              user?.role === 'member' && !membershipExpired && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowTrainerSelection(true)}
                    className="bg-blue-600/20 hover:bg-blue-600/30 border-blue-500 text-blue-100"
                  >
                    <Dumbbell className="h-4 w-4 mr-2" />
                    Select a Trainer
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipCard;