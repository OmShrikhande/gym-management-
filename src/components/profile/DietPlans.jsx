import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { UtensilsCrossed, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const getDaysPassed = (startDateStr) => {
  if (!startDateStr) return 0;
  const startDate = new Date(startDateStr);
  const today = new Date();
  const diffTime = today - startDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const DietPlans = ({ user, dietPlans, membershipData }) => {
  const navigate = useNavigate();

  if (user?.role !== 'member' || !membershipData.assignedTrainer) return null;

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <UtensilsCrossed className="h-5 w-5 mr-2" />
          Diet Plans
        </CardTitle>
        <CardDescription className="text-gray-400">
          Your personalized nutrition plans from your trainer
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dietPlans.length > 0 ? (
          <div className="space-y-4">
            {dietPlans.map((plan) => (
              <div key={plan._id} className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-white mb-2">{plan.name}</h4>
                    <p className="text-gray-300 text-sm mb-3">{plan.description}</p>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <UIBadge variant="secondary" className="bg-green-600/20 text-green-100 border-green-500">
                        {plan.type || 'General'}
                      </UIBadge>
                      <UIBadge variant="outline" className="border-gray-500 text-gray-300">
                        {plan.calories || 'N/A'} cal
                      </UIBadge>
                      <UIBadge variant="outline" className="border-gray-500 text-gray-300">
                        Day {getDaysPassed(plan.createdAt)}
                      </UIBadge>
                    </div>
                    
                    <div className="text-sm text-gray-400">
                      <p>Meals: {plan.meals?.length || 0}</p>
                      <p>Created: {new Date(plan.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Button 
                      size="sm" 
                      onClick={() => navigate(`/diet-plans/${plan._id}`)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <ChevronRight className="h-4 w-4 mr-1" />
                      View Plan
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <UtensilsCrossed className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No diet plans assigned yet</p>
            <p className="text-gray-500 text-sm">
              Your trainer will assign nutrition plans for you soon
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DietPlans;