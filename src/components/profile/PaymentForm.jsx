import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreditCard, Loader2, X } from "lucide-react";

const PaymentForm = ({ 
  showPaymentForm,
  setShowPaymentForm,
  selectedTrainer,
  setSelectedTrainer,
  paymentAmount,
  handleTrainerPayment,
  isLoading
}) => {
  if (!showPaymentForm) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-green-400" />
            Trainer Payment
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowPaymentForm(false);
              setSelectedTrainer(null);
            }}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mb-4 p-3 bg-gray-700/50 rounded-md border border-gray-600">
          <div className="flex items-center mb-3">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={selectedTrainer?.profilePicture} alt={selectedTrainer?.name} />
              <AvatarFallback className="bg-blue-600 text-white">
                {selectedTrainer?.name?.charAt(0) || 'T'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium text-white">{selectedTrainer?.name}</h4>
              <p className="text-sm text-gray-400">
                {selectedTrainer?.specialization || 'General Fitness'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Trainer Fee</p>
            <p className="text-white font-medium">₹{paymentAmount.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="cardNumber" className="text-gray-300">Card Number</Label>
            <Input 
              id="cardNumber" 
              placeholder="1234 5678 9012 3456" 
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiry" className="text-gray-300">Expiry Date</Label>
              <Input 
                id="expiry" 
                placeholder="MM/YY" 
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="cvv" className="text-gray-300">CVV</Label>
              <Input 
                id="cvv" 
                placeholder="123" 
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="name" className="text-gray-300">Name on Card</Label>
            <Input 
              id="name" 
              placeholder="John Doe" 
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowPaymentForm(false);
              setSelectedTrainer(null);
            }}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleTrainerPayment}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay ₹{paymentAmount.toLocaleString()}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;