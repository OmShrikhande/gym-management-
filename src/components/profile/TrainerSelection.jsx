import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge as UIBadge } from "@/components/ui/badge";
import { User, Star, Clock, X } from "lucide-react";

const TrainerSelection = ({ 
  showTrainerSelection, 
  setShowTrainerSelection,
  availableTrainers,
  selectedTrainer,
  setSelectedTrainer,
  paymentAmount,
  setPaymentAmount,
  setShowPaymentForm
}) => {
  if (!showTrainerSelection) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-400" />
              Select Your Trainer
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowTrainerSelection(false);
                setSelectedTrainer(null);
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {availableTrainers.map((trainer) => (
              <div
                key={trainer._id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedTrainer?._id === trainer._id
                    ? 'border-blue-500 bg-blue-600/20'
                    : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                }`}
                onClick={() => {
                  setSelectedTrainer(trainer);
                  setPaymentAmount(trainer.monthlyFee || 2000);
                }}
              >
                <div className="flex items-center mb-3">
                  <Avatar className="h-12 w-12 mr-3">
                    <AvatarImage src={trainer.profilePicture} alt={trainer.name} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {trainer.name?.charAt(0) || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{trainer.name}</h4>
                    <p className="text-sm text-gray-400">{trainer.specialization || 'General Fitness'}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-sm text-gray-300">
                    <Star className="h-4 w-4 mr-1 text-yellow-400" />
                    {trainer.experience || 'New'} experience
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <Clock className="h-4 w-4 mr-1 text-green-400" />
                    {trainer.availability || 'Available'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <UIBadge variant="secondary" className="bg-green-600/20 text-green-100 border-green-500">
                    ₹{trainer.monthlyFee || 2000}/month
                  </UIBadge>
                  {selectedTrainer?._id === trainer._id && (
                    <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                  )}
                </div>
                
                {trainer.bio && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{trainer.bio}</p>
                )}
              </div>
            ))}
          </div>
          
          {selectedTrainer && (
            <div className="p-4 bg-gray-700/50 rounded-md border border-gray-600 mb-4">
              <h4 className="text-white font-medium mb-2">Selected Trainer</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback className="bg-blue-600 text-white text-sm">
                      {selectedTrainer.name?.charAt(0) || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white text-sm font-medium">{selectedTrainer.name}</p>
                    <p className="text-gray-400 text-xs">{selectedTrainer.specialization}</p>
                  </div>
                </div>
                <p className="text-white font-medium">
                  ₹{paymentAmount.toLocaleString()} per month
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowTrainerSelection(false);
                setSelectedTrainer(null);
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowTrainerSelection(false);
                setShowPaymentForm(true);
              }}
              disabled={!selectedTrainer}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50"
            >
              Continue to Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerSelection;