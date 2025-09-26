import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { extractId } from "@/utils/idUtils";

// Import the new components
import ProfileHeader from "@/components/profile/ProfileHeader";
import MembershipCard from "@/components/profile/MembershipCard";
import RoleSpecificInfo from "@/components/profile/RoleSpecificInfo";
import HealthMetrics from "@/components/profile/HealthMetrics";
import WorkoutPlans from "@/components/profile/WorkoutPlans";
import DietPlans from "@/components/profile/DietPlans";
import TrainerSelection from "@/components/profile/TrainerSelection";
import PaymentForm from "@/components/profile/PaymentForm";

const Profile = () => {
  const { user, authFetch, updateCurrentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTrainerSelection, setShowTrainerSelection] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [availableTrainers, setAvailableTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [membershipExpired, setMembershipExpired] = useState(false);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [fitnessProgressEditing, setFitnessProgressEditing] = useState(false);
  
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "Male",
    specialization: "",
    experience: "",
    bio: "",
    availability: "",
    certifications: "",
    gymName: "",
    address: "",
    whatsapp: "",
    upiId: "",
    // Health metrics for members
    height: "",
    weight: "",
    fitnessGoal: "weight-loss",
    initialWeight: "",
    targetWeight: "",
    // Fitness progress metrics
    currentProgress: "",
    progressNotes: "",
    progressHistory: []
  });
  
  // State for membership data
  const [membershipData, setMembershipData] = useState({
    status: "Active",
    startDate: null,
    endDate: null,
    type: "Standard",
    assignedTrainer: null,
    trainerName: "",
    daysRemaining: 0
  });

  // Handle input changes
  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to fetch available trainers
  const fetchAvailableTrainers = async () => {
    try {
      const response = await authFetch('/auth/users?role=trainer');
      if (response.ok) {
        const data = await response.json();
        setAvailableTrainers(data.data.users || []);
      } else {
        toast.error('Failed to load available trainers');
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
      toast.error('Failed to load available trainers');
    }
  };
  
  // Handle trainer payment and assignment
  const handleTrainerPayment = async () => {
    if (!selectedTrainer) {
      toast.error('Please select a trainer first');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create a payment record
      const paymentResponse = await authFetch('/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentType: 'Trainer Fee',
          paymentMethod: 'Card',
          status: 'Paid',
          description: `Trainer fee for ${selectedTrainer.name}`,
          trainerId: selectedTrainer._id
        })
      });
      
      if (!paymentResponse.ok) {
        throw new Error('Payment failed');
      }
      
      // Update user profile with assigned trainer
      const updateResponse = await authFetch('/auth/update-me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignedTrainer: selectedTrainer._id
        })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }
      
      // Update local state
      setMembershipData(prev => ({
        ...prev,
        assignedTrainer: selectedTrainer._id,
        trainerName: selectedTrainer.name
      }));
      
      // Update user context
      if (updateCurrentUser) {
        updateCurrentUser({
          ...user,
          assignedTrainer: selectedTrainer._id,
          trainerName: selectedTrainer.name
        });
      }
      
      toast.success(`Successfully assigned ${selectedTrainer.name} as your trainer`);
      setShowPaymentForm(false);
      setSelectedTrainer(null);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile save
  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const updateData = {
        name: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        gender: profileData.gender,
        ...(user?.role === 'trainer' && {
          specialization: profileData.specialization,
          experience: profileData.experience,
          certifications: profileData.certifications,
          availability: profileData.availability,
          bio: profileData.bio
        }),
        ...(user?.role === 'gym-owner' && {
          gymName: profileData.gymName,
          address: profileData.address,
          whatsapp: profileData.whatsapp,
          upiId: profileData.upiId
        }),
        ...(user?.role === 'super-admin' && {
          whatsapp: profileData.whatsapp,
          experience: profileData.experience
        }),
        ...(user?.role === 'member' && {
          address: profileData.address,
          whatsapp: profileData.whatsapp,
          height: profileData.height,
          weight: profileData.weight,
          fitnessGoal: profileData.fitnessGoal,
          initialWeight: profileData.initialWeight,
          targetWeight: profileData.targetWeight
        })
      };

      const response = await authFetch('/auth/update-me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      
      // Update user context
      if (updateCurrentUser) {
        updateCurrentUser(data.data.user);
      }

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle fitness progress update
  const handleFitnessProgressUpdate = async () => {
    setIsLoading(true);
    
    try {
      const updateData = {
        weight: profileData.weight,
        currentProgress: profileData.currentProgress,
        progressNotes: profileData.progressNotes
      };

      const response = await authFetch('/auth/update-me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update fitness progress');
      }

      const data = await response.json();
      
      // Update user context
      if (updateCurrentUser) {
        updateCurrentUser(data.data.user);
      }

      toast.success('Fitness progress updated successfully!');
      setFitnessProgressEditing(false);
      
    } catch (error) {
      console.error('Error updating fitness progress:', error);
      toast.error('Failed to update fitness progress. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check membership expiration on mount
  useEffect(() => {
    if (user && user.role === 'member') {
      // Always set membership as active
      setMembershipExpired(false);
      
      // Calculate days remaining if end date exists
      if (user.membershipEndDate) {
        const today = new Date();
        const endDate = new Date(user.membershipEndDate);
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setMembershipData(prev => ({
          ...prev,
          daysRemaining: diffDays > 0 ? diffDays : 0,
          status: 'Active'
        }));
      } else {
        // If no end date, set a default value
        setMembershipData(prev => ({
          ...prev,
          daysRemaining: 365, // Default to 1 year
          status: 'Active'
        }));
      }
    }
  }, [user]);

  // Load user data when component mounts
  useEffect(() => {
    if (!user) return;

    // Guard to ensure this effect runs only once per mount for the same user
    const runOnceForUserRef = (Profile.runOnceForUserRef ||= new Map());
    const userId = user?._id || 'anonymous';
    if (runOnceForUserRef.get(userId)) return;
    runOnceForUserRef.set(userId, true);

    setProfileData({
      fullName: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      gender: user.gender || "Male",
      specialization: user.specialization || "",
      experience: user.experience || "",
      bio: user.bio || "",
      availability: user.availability || "",
      certifications: user.certifications || "",
      gymName: user.gymName || "",
      address: user.address || "",
      whatsapp: user.whatsapp || "",
      upiId: user.upiId || "",
      height: user.height || "",
      weight: user.weight || "",
      fitnessGoal: user.fitnessGoal || user.goal || "weight-loss",
      initialWeight: user.initialWeight || "",
      targetWeight: user.targetWeight || "",
      currentProgress: user.currentProgress || "",
      progressNotes: user.progressNotes || "",
      progressHistory: user.progressHistory || []
    });

    // Calculate days remaining in membership
    const calculateDaysRemaining = (endDate) => {
      if (!endDate) return 0;
      const end = new Date(endDate);
      const today = new Date();
      const diffTime = end - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    };

    // Check if membership is expired
    const checkMembershipExpired = (endDate) => {
      if (!endDate) return true;
      const end = new Date(endDate);
      const today = new Date();
      return end < today;
    };

    // Set membership data if available
    if (user.membershipStatus || user.membershipEndDate) {
      const daysRemaining = calculateDaysRemaining(user.membershipEndDate);
      const isExpired = checkMembershipExpired(user.membershipEndDate);

      setMembershipData({
        status: isExpired ? "Expired" : user.membershipStatus || "Active",
        startDate: user.membershipStartDate || user.createdAt,
        endDate: user.membershipEndDate || null,
        type: user.membershipType || "Standard",
        assignedTrainer: user.assignedTrainer || null,
        trainerName: user.trainerName || "",
        daysRemaining: daysRemaining
      });

      setMembershipExpired(isExpired);
    }

    // If user is a member, fetch additional membership details
    const fetchAllForMember = async () => {
      if (user.role !== 'member') return;
      try {
        const response = await authFetch(`/users/${user._id}/details`);
        if (response.success || response.status === 'success') {
          const memberData = response.data?.user || {};

          if (memberData.membership) {
            const daysRemaining = calculateDaysRemaining(memberData.membership.endDate);
            const isExpired = checkMembershipExpired(memberData.membership.endDate);
            setMembershipData({
              status: isExpired ? "Expired" : memberData.membership.status || "Active",
              startDate: memberData.membership.startDate || user.membershipStartDate || user.createdAt,
              endDate: memberData.membership.endDate,
              type: memberData.membership.type || "Standard",
              assignedTrainer: memberData.assignedTrainer || null,
              trainerName: memberData.trainerName || "",
              daysRemaining
            });
            setMembershipExpired(isExpired);
            updateCurrentUser({
              ...user,
              membershipStatus: isExpired ? "Expired" : memberData.membership.status,
              membershipEndDate: memberData.membership.endDate,
              membershipType: memberData.membership.type,
              membershipDaysRemaining: daysRemaining
            });
          }

          if (memberData.healthMetrics) {
            setProfileData(prev => ({
              ...prev,
              height: memberData.healthMetrics.height || prev.height,
              weight: memberData.healthMetrics.weight || prev.weight,
              initialWeight: memberData.healthMetrics.initialWeight || prev.initialWeight,
              targetWeight: memberData.healthMetrics.targetWeight || prev.targetWeight,
              fitnessGoal: memberData.healthMetrics.fitnessGoal || prev.fitnessGoal,
              currentProgress: memberData.healthMetrics.currentProgress || prev.currentProgress,
              progressNotes: memberData.healthMetrics.progressNotes || prev.progressNotes,
              progressHistory: memberData.healthMetrics.progressHistory || prev.progressHistory
            }));
            updateCurrentUser({
              ...user,
              height: memberData.healthMetrics.height,
              weight: memberData.healthMetrics.weight,
              initialWeight: memberData.healthMetrics.initialWeight,
              targetWeight: memberData.healthMetrics.targetWeight,
              fitnessGoal: memberData.healthMetrics.fitnessGoal,
              currentProgress: memberData.healthMetrics.currentProgress,
              progressNotes: memberData.healthMetrics.progressNotes,
              progressHistory: memberData.healthMetrics.progressHistory
            });
          }
        } else {
          console.warn('Failed to fetch member details:', response.message);
        }

        // In parallel: trainer details + plans only if assignedTrainer exists
        if (user.assignedTrainer) {
          const trainerId = extractId(user.assignedTrainer);
          if (trainerId) {
            try {
              const [trainerResponse, workoutResponse, dietResponse] = await Promise.all([
                authFetch(`/users/${trainerId}`),
                authFetch(`/workouts/member/${user._id}`),
                authFetch(`/diet-plans/member/${user._id}`)
              ]);

              if (trainerResponse.success || trainerResponse.status === 'success') {
                const trainerName = trainerResponse.data?.user?.name || "Unknown Trainer";
                setMembershipData(prev => ({ ...prev, trainerName }));
                updateCurrentUser({ ...user, trainerName });
              }

              if (workoutResponse.success || workoutResponse.status === 'success') {
                setWorkoutPlans(workoutResponse.data?.workouts || []);
              } else {
                setWorkoutPlans([]);
              }

              if (dietResponse.success || dietResponse.status === 'success') {
                setDietPlans(dietResponse.data?.dietPlans || []);
              } else {
                setDietPlans([]);
              }
            } catch (e) {
              console.error('Error fetching trainer/workout/diet data:', e);
            }
          }
        } else {
          // If member doesn't have a trainer yet, fetch available trainers
          fetchAvailableTrainers();
        }
      } catch (error) {
        console.error('Error fetching member details:', error);
      }
    };

    fetchAllForMember();
  }, [user, authFetch, updateCurrentUser]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <ProfileHeader
          user={user}
          profileData={profileData}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          isLoading={isLoading}
          handleInputChange={handleInputChange}
          handleSave={handleSave}
        />

        {/* Membership Card (Members only) */}
        <MembershipCard
          user={user}
          membershipData={membershipData}
          membershipExpired={membershipExpired}
          setShowTrainerSelection={setShowTrainerSelection}
        />

        {/* Role-specific Information */}
        <RoleSpecificInfo
          user={user}
          profileData={profileData}
          handleInputChange={handleInputChange}
          isEditing={isEditing}
        />

        {/* Health Metrics (Members only) */}
        <HealthMetrics
          user={user}
          profileData={profileData}
          handleInputChange={handleInputChange}
          isEditing={isEditing}
          fitnessProgressEditing={fitnessProgressEditing}
          setFitnessProgressEditing={setFitnessProgressEditing}
          handleFitnessProgressUpdate={handleFitnessProgressUpdate}
          isLoading={isLoading}
        />

        {/* Workout Plans (Members with trainers only) */}
        <WorkoutPlans
          user={user}
          workoutPlans={workoutPlans}
          membershipData={membershipData}
        />

        {/* Diet Plans (Members with trainers only) */}
        <DietPlans
          user={user}
          dietPlans={dietPlans}
          membershipData={membershipData}
        />

        {/* Trainer Selection Modal */}
        <TrainerSelection
          showTrainerSelection={showTrainerSelection}
          setShowTrainerSelection={setShowTrainerSelection}
          availableTrainers={availableTrainers}
          selectedTrainer={selectedTrainer}
          setSelectedTrainer={setSelectedTrainer}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          setShowPaymentForm={setShowPaymentForm}
        />

        {/* Payment Form Modal */}
        <PaymentForm
          showPaymentForm={showPaymentForm}
          setShowPaymentForm={setShowPaymentForm}
          selectedTrainer={selectedTrainer}
          setSelectedTrainer={setSelectedTrainer}
          paymentAmount={paymentAmount}
          handleTrainerPayment={handleTrainerPayment}
          isLoading={isLoading}
        />
      </div>
    </DashboardLayout>
  );
};

export default Profile;