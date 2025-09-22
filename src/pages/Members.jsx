import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Users, User, Edit, Trash2, Calendar, Target, X, AlertCircle, CreditCard, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MemberDetailView from "@/components/members/MemberDetailView";
import { useAuth } from "@/contexts/AuthContext";
import QRPaymentModal from "@/components/payment/QRPaymentModal";
import AddMemberPayment from "@/components/payments/AddMemberPayment";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import ManualReceiptModal from '@/components/payment/ManualReceiptModal';
import AddMemberForm from "@/components/members/AddMemberForm";

// Helper function to get trainer fee consistently
const getTrainerFee = (trainer) => {
  if (!trainer) return 0;
  return trainer.trainerFee || parseInt(trainer.salary) || 0;
};

// const Members = () => {
const Members = () => {
  const { createMember, isGymOwner, isTrainer, users, fetchUsers, user, subscription, authFetch, checkSubscriptionStatus, updateMember, deleteMember } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterGoal, setFilterGoal] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showManualReceiptModal, setShowManualReceiptModal] = useState(false);
  const [manualReceiptData, setManualReceiptData] = useState({
    memberEmail: '',
    memberName: '',
    amount: '',
    planType: '',
    duration: '',
    paymentMethod: 'Cash',
    transactionId: '',
    notes: '',
    periodStart: '',
    periodEnd: '',
    trainerName: ''
  });
  // Initial form data with default values
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    gender: 'Male',
    dob: '',
    goal: 'weight-loss',
    planType: '', // Will be updated after gymOwnerPlans is loaded
    // New: capture payment mode
    paymentMode: 'online',
    // New: manual agreed amount input
    agreedAmount: '',
    address: '',
    whatsapp: '',
    height: '',
    weight: '',
    emergencyContact: '',
    medicalConditions: '',
    requiresTrainer: false,
    assignedTrainer: '', // Trainer ID will be stored here
    membershipDuration: '1', // in months (default 1 month)
    durationType: 'preset', // 'preset' or 'custom'
    fitnessGoalDescription: '',
    joiningDate: '' // New field for joining date
  });
  
  // State for available trainers
  const [availableTrainers, setAvailableTrainers] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [realMembers, setRealMembers] = useState([]);
  const [trainerMembers, setTrainerMembers] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingMemberData, setPendingMemberData] = useState(null);
  const [formStep, setFormStep] = useState(1); // 1: Basic Info, 2: Membership Details, 3: Review
  const [customDuration, setCustomDuration] = useState(''); // For custom duration input
  const [subscriptionInfo, setSubscriptionInfo] = useState({
    maxMembers: 0,
    currentMembers: 0,
    hasActiveSubscription: false,
    plan: 'Basic'
  });
  
  // State for gym owner plans
  const [gymOwnerPlans, setGymOwnerPlans] = useState([]);
  
  // Fetch gym owner plans
  const fetchGymOwnerPlans = useCallback(async () => {
    if (!user || !isGymOwner) return;
    
    try {
      console.log('Fetching gym owner plans for:', user._id);
      
      // Try to fetch existing plans first
      const response = await authFetch('/gym-owner-plans');
      
      if (response.success || response.status === 'success') {
        const plans = response.data?.plans || [];
        
        // If no plans exist, create default ones
        if (plans.length === 0) {
          console.log('No plans found, creating default plans');
          const defaultResponse = await authFetch('/gym-owner-plans/default');
          
          if (defaultResponse.success || defaultResponse.status === 'success') {
            const defaultPlans = defaultResponse.data?.plans || [];
            console.log('Default plans created:', defaultPlans.length);
            setGymOwnerPlans(defaultPlans);
            
            // Update the default planType
            if (defaultPlans.length > 0) {
              setFormData(prev => ({
                ...prev,
                planType: defaultPlans[0].name
              }));
            }
          }
        } else {
          console.log('Gym owner plans fetched successfully:', plans.length);
          setGymOwnerPlans(plans);
          
          // Update the default planType if needed
          if (plans.length > 0) {
            setFormData(prev => ({
              ...prev,
              planType: plans[0].name
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching gym owner plans:', error);
      // No fallback - user should create plans first
      setGymOwnerPlans([]);
      toast.error('Failed to load membership plans. Please create your membership plans first.');
    }
  }, [user, isGymOwner, authFetch]);

  // Fetch subscription info to check member limits - USE CONTEXT DATA INSTEAD OF API CALLS
  const fetchSubscriptionInfo = useCallback(() => {
    if (!user || !isGymOwner) return;
    
    try {
      console.log('Processing subscription info for gym owner:', user._id);
      console.log('Current subscription from context:', subscription);
      
      // Use data from context instead of making API calls
      let hasActiveSubscription = subscription?.hasActiveSubscription || false;
      let plan = subscription?.subscription?.plan || 'Basic';
      let maxMembers = 200; // Default for Basic plan
      
      // Set max members based on plan
      if (plan === 'Premium' || plan === 'Premium Member') maxMembers = 500;
      if (plan === 'Enterprise' || plan === 'Elite Member') maxMembers = 1000;
      
      // Count current members
      const currentMembers = users.filter(u => u.role === 'member').length;
      
      console.log('Max members:', maxMembers, 'Current members:', currentMembers);
      
      // Only update if the values have actually changed
      setSubscriptionInfo(prev => {
        const newInfo = {
          maxMembers,
          currentMembers,
          hasActiveSubscription,
          plan
        };
        
        // Check if anything has actually changed
        if (prev.maxMembers === newInfo.maxMembers &&
            prev.currentMembers === newInfo.currentMembers &&
            prev.hasActiveSubscription === newInfo.hasActiveSubscription &&
            prev.plan === newInfo.plan) {
          return prev; // No change, return previous state
        }
        
        console.log('Subscription info set:', newInfo);
        return newInfo;
      });
      
    } catch (error) {
      console.error('Error processing subscription info:', error);
      // Set default values
      const currentMembers = users.filter(u => u.role === 'member').length;
      const defaultInfo = {
        maxMembers: 200,
        currentMembers,
        hasActiveSubscription: subscription?.hasActiveSubscription || false,
        plan: 'Basic'
      };
      
      setSubscriptionInfo(defaultInfo);
      console.log('Using default subscription info:', defaultInfo);
    }
  }, [user?._id, isGymOwner, subscription?.hasActiveSubscription, subscription?.subscription?.plan, users.length]);

  // Use ref to prevent multiple data loads
  const hasInitiallyLoaded = useRef(false);
  const lastUserId = useRef(null);
  
  // Reset loading flag when user changes
  useEffect(() => {
    if (user?._id !== lastUserId.current) {
      hasInitiallyLoaded.current = false;
      lastUserId.current = user?._id;
    }
  }, [user?._id]);

  // Function to fetch trainers for the current gym
  const fetchTrainers = useCallback(() => {
    if (!user || !isGymOwner) return;
    
    try {
      // Filter trainers from users array
      const gymTrainers = users.filter(u => u.role === 'trainer');
      setAvailableTrainers(prev => {
        // Only update if the trainers have actually changed
        if (prev.length !== gymTrainers.length || 
            !prev.every(trainer => gymTrainers.some(gt => gt._id === trainer._id))) {
          return gymTrainers;
        }
        return prev;
      });
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  }, [user?._id, isGymOwner, users.length]);
  
  // Function to fetch members assigned to the current trainer
  const fetchTrainerMembers = useCallback(async () => {
    if (!user || !isTrainer) return;
    
    try {
      console.log('Fetching members for trainer:', user._id);
      const response = await authFetch(`/users/trainer/${user._id}/members`);
      console.log('Trainer members response:', response);
      
      if (response.success || response.status === 'success') {
        const members = response.data?.members || [];
        console.log('Trainer assigned members:', members.length);
        
        // Process members data
        const processedMembers = members.map(member => ({
          id: member._id,
          name: member.name,
          email: member.email,
          mobile: member.phone || '',
          whatsapp: member.whatsapp || '',
          gender: member.gender || 'Not specified',
          dob: member.dob || '',
          joinDate: member.createdAt || new Date().toISOString(),
          assignedTrainer: member.assignedTrainer || null,
          goal: member.goal || 'general-fitness',
          membershipStatus: member.membershipStatus || 'Active',
          planType: member.planType || 'Basic',
          profileImage: member.profileImage || null,
          address: member.address || '',
          height: member.height || '',
          weight: member.weight || '',
          emergencyContact: member.emergencyContact || '',
          medicalConditions: member.medicalConditions || '',
          lastCheckIn: member.lastCheckIn || '',
          attendanceRate: member.attendanceRate || '0%',
          paymentStatus: member.paymentStatus || 'Paid',
          notes: member.notes || ''
        }));
        
        setTrainerMembers(processedMembers);
      }
    } catch (error) {
      console.error('Error fetching trainer members:', error);
    }
  }, [user, isTrainer, authFetch]);

  // Combined data loading effect to reduce re-renders
  useEffect(() => {
    // Use a ref to prevent multiple loads
    let loadingTimeout;
    
    const loadData = async () => {
      // Prevent multiple simultaneous loads
      if (hasInitiallyLoaded.current) return;
      hasInitiallyLoaded.current = true;
      
      // Clear any existing timeout
      if (loadingTimeout) clearTimeout(loadingTimeout);
      
      // Set a small delay before showing loading state to prevent flickering
      loadingTimeout = setTimeout(() => {
        if (!isLoading) setIsLoading(true);
      }, 300);
      
      try {
        console.log('Loading data for Members page...');
        
        // Step 1: Fetch users (force refresh to get latest data)
        await fetchUsers(true);
        
        // Step 2: Check subscription status if user is gym owner (only once)
        if (user && isGymOwner && checkSubscriptionStatus && !subscription?.hasActiveSubscription) {
          console.log('Checking subscription status for gym owner:', user._id);
          await checkSubscriptionStatus(user._id, null, true);
        }
        
        // Step 3: Fetch gym owner plans if needed
        if (user && isGymOwner) {
          console.log('Fetching gym owner plans');
          await fetchGymOwnerPlans();
        }
        
        console.log('Data loading complete');
        
        // Clear the loading timeout
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setMessage({ type: 'error', text: 'Failed to load data' });
        
        // Clear the loading timeout
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
        
        // Set loading to false
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Cleanup function to clear timeout if component unmounts
    return () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, [fetchUsers, user, isGymOwner, isTrainer]); // Simplified dependencies

  // Separate effect to process subscription info when users or subscription changes
  useEffect(() => {
    if (user && isGymOwner && subscription && users.length > 0) {
      console.log('Processing subscription info for gym owner');
      fetchSubscriptionInfo();
    }
  }, [subscription?.hasActiveSubscription, subscription?.subscription?.plan, users.length, user, isGymOwner]); // Only depend on specific values

  // Separate effect to fetch trainers when users are loaded
  useEffect(() => {
    if (user && isGymOwner && users.length > 0) {
      console.log('Fetching trainers');
      fetchTrainers();
    }
  }, [users.length, user, isGymOwner]);

  // Separate effect to fetch trainer members
  useEffect(() => {
    if (user && isTrainer) {
      console.log('Fetching trainer members');
      fetchTrainerMembers();
    }
  }, [user, isTrainer]);

  // Process users to get members - only runs when users array changes
  useEffect(() => {
    // Use a debounce to prevent flickering
    const processTimeout = setTimeout(() => {
      console.log('Processing users to get members, users count:', users?.length || 0);
      
      if (!users || users.length === 0) {
        console.log('No users found, skipping member processing');
        setIsLoading(false);
        return;
      }
      
      // Filter users to get only members
      const members = users
        .filter(user => user.role === 'member')
        .map(member => {
          // Calculate membership end date if not present but duration is available
          let membershipEndDate = member.membershipEndDate;
          if (!membershipEndDate && member.membershipDuration && (member.membershipStartDate || member.createdAt)) {
            const startDate = new Date(member.membershipStartDate || member.createdAt);
            const endDate = new Date(startDate);
            const duration = parseInt(member.membershipDuration || '1'); // Default to 1 month if not specified
            endDate.setMonth(endDate.getMonth() + duration);
            membershipEndDate = endDate.toISOString();
          }
          
          return {
            id: member._id,
            name: member.name,
            email: member.email,
            mobile: member.phone || '',
            whatsapp: member.whatsapp || '',
            gender: member.gender || 'Not specified',
            dob: member.dob || '',
            joinDate: member.createdAt || new Date().toISOString(),
            assignedTrainer: member.assignedTrainer || null,
            goal: member.goal || 'general-fitness',
            membershipStatus: member.membershipStatus || 'Active',
            planType: member.planType || 'Basic',
            profileImage: member.profileImage || null,
            address: member.address || '',
            height: member.height || '',
            weight: member.weight || '',
            emergencyContact: member.emergencyContact || '',
            medicalConditions: member.medicalConditions || '',
            lastCheckIn: member.lastCheckIn || '',
            attendanceRate: member.attendanceRate || '0%',
            paymentStatus: member.paymentStatus || 'Paid',
            notes: member.notes || '',
            // Membership details
            membershipStartDate: member.membershipStartDate || member.createdAt,
            membershipEndDate: membershipEndDate,
            membershipDuration: member.membershipDuration || '1',
            // Attendance data
            attendance: member.attendance || []
          };
        });
      
      console.log('Setting real members, count:', members.length);
      
      // Batch state updates to reduce re-renders
      const batchUpdates = () => {
        setRealMembers(members);
        
        // Update subscription info with current member count
        if (isGymOwner) {
          setSubscriptionInfo(prev => ({
            ...prev,
            currentMembers: members.length
          }));
        }
        
        // Only set loading to false after we've processed the data
        setIsLoading(false);
      };
      
      // Execute batch updates
      batchUpdates();
    }, 100); // Small delay to batch updates
    
    // Cleanup function
    return () => clearTimeout(processTimeout);
  }, [users, isGymOwner]);

  // Debounce search term to prevent excessive filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Determine which members list to use based on user role
  const membersToFilter = isTrainer ? trainerMembers : realMembers;

  const filteredMembers = membersToFilter.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         (member.assignedTrainer && typeof member.assignedTrainer === 'string' && member.assignedTrainer.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    const matchesGoal = filterGoal === "all" || member.goal === filterGoal;
    const derivedStatus = computeMembershipStatus(member);
    const matchesStatus = filterStatus === "all" || derivedStatus === filterStatus;
    return matchesSearch && matchesGoal && matchesStatus;
  });

  const getGoalBadge = (goal) => {
    const goalConfig = {
      'weight-loss': { variant: 'destructive', label: 'Weight Loss' },
      'weight-gain': { variant: 'default', label: 'Weight Gain' },
      'general-fitness': { variant: 'secondary', label: 'General Fitness' }
    };
    const config = goalConfig[goal] || { variant: 'outline', label: goal };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    const variant = status === 'Active' ? 'default' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  // Determine derived membership status from end date if available
  function computeMembershipStatus(member) {
    const explicit = String(member?.membershipStatus || '').trim();
    if (['Inactive','inactive','Expired','expired','Pending','pending'].includes(explicit)) {
      return explicit.charAt(0).toUpperCase() + explicit.slice(1).toLowerCase();
    }

    // Determine end date precedence: explicit field, or derive from start + duration
    let endDate = member?.membershipEndDate;
    if (!endDate && (member?.membershipStartDate || member?.createdAt) && member?.membershipDuration) {
      const start = new Date(member.membershipStartDate || member.createdAt);
      const end = new Date(start);
      const months = parseInt(member.membershipDuration || '1', 10);
      if (!Number.isNaN(months)) {
        end.setMonth(end.getMonth() + months);
        endDate = end.toISOString();
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime()) && end < new Date()) return 'Expired';
    }

    return explicit || 'Active';
  }

  const getPlanBadge = (plan) => {
    const variant = plan === 'Premium' ? 'default' : 'secondary';
    return <Badge variant={variant}>{plan}</Badge>;
  };

  const memberStats = isTrainer 
    ? {
        total: trainerMembers.length,
        active: trainerMembers.filter(m => m.membershipStatus === 'Active').length,
        weightLoss: trainerMembers.filter(m => m.goal === 'weight-loss').length,
        weightGain: trainerMembers.filter(m => m.goal === 'weight-gain').length,
        premium: trainerMembers.filter(m => 
          m.planType === 'Premium' || 
          m.planType === 'Premium Member' || 
          m.planType?.toLowerCase().includes('premium')
        ).length
      }
    : {
        total: realMembers.length,
        active: realMembers.filter(m => computeMembershipStatus(m) === 'Active').length,
        weightLoss: realMembers.filter(m => m.goal === 'weight-loss').length,
        weightGain: realMembers.filter(m => m.goal === 'weight-gain').length,
        premium: realMembers.filter(m => 
          m.planType === 'Premium' || 
          m.planType === 'Premium Member' || 
          m.planType?.toLowerCase().includes('premium')
        ).length
      };

  // Memoized input change handler to prevent unnecessary re-renders
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const resetForm = () => {
    // Get the first plan name from gymOwnerPlans, or leave empty if none available
    const defaultPlanName = gymOwnerPlans.length > 0 ? gymOwnerPlans[0].name : '';
    
    setFormData({
      name: '',
      email: '',
      password: '',
      mobile: '',
      gender: 'Male',
      dob: '',
      goal: 'weight-loss',
      planType: defaultPlanName,
      address: '',
      whatsapp: '',
      height: '',
      weight: '',
      emergencyContact: '',
      medicalConditions: '',
      requiresTrainer: false,
      assignedTrainer: '',
      membershipDuration: '1',
      durationType: 'preset',
      fitnessGoalDescription: '',
      joiningDate: '' // Reset joining date
    });
    setCustomDuration('');
    setMessage({ type: '', text: '' });
    setFormStep(1); // Reset to first step
  };

  const handleViewMember = (member) => {
    setSelectedMember(member);
    setShowDetailView(true);
  };
  
  const handleCloseDetailView = () => {
    setSelectedMember(null);
    setShowDetailView(false);
    setIsEditMode(false);
  };
  
  // Handle edit member
  const handleEditMember = (member) => {
    setSelectedMember(member);
    setIsEditMode(true);
    setShowDetailView(true);
    
    // Populate form data with member details
    setFormData({
      name: member.name,
      email: member.email,
      password: '', // Don't populate password for security
      mobile: member.mobile || '',
      gender: member.gender || 'Male',
      dob: member.dob || '',
      goal: member.goal || 'weight-loss',
      planType: member.planType || 'Basic Member',
      address: member.address || '',
      whatsapp: member.whatsapp || '',
      height: member.height || '',
      weight: member.weight || '',
      emergencyContact: member.emergencyContact || '',
      medicalConditions: member.medicalConditions || '',
      requiresTrainer: !!member.assignedTrainer,
      assignedTrainer: member.assignedTrainer || '',
      membershipDuration: '1', // Default
      fitnessGoalDescription: member.notes || '',
      joiningDate: member.createdAt ? new Date(member.createdAt).toISOString().split('T')[0] : '' // Format date for input
    });
  };
  
  // Handle update member
  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    
    setFormSubmitting(true);
    setMessage({ type: 'info', text: 'Updating member...' });
    
    try {
      // Prepare data for API
      const updateData = {
        id: selectedMember.id, // Include ID in the request body
        name: formData.name,
        email: formData.email,
        phone: formData.mobile,
        gender: formData.gender,
        dob: formData.dob,
        goal: formData.goal,
        planType: formData.planType,
        address: formData.address,
        whatsapp: formData.whatsapp,
        height: formData.height,
        weight: formData.weight,
        emergencyContact: formData.emergencyContact,
        medicalConditions: formData.medicalConditions,
        assignedTrainer: formData.requiresTrainer ? formData.assignedTrainer : null,
        notes: formData.fitnessGoalDescription,
        role: 'member', // Ensure role is specified
        joiningDate: formData.joiningDate // Include joining date
      };
      
      // If password is provided, include it
      if (formData.password && formData.password.length >= 6) {
        updateData.password = formData.password;
      }
      
      console.log(`Attempting to update member with ID: ${selectedMember.id}`);
      
      // Use the updateMember function from AuthContext
      const result = await updateMember(updateData);
      
      if (result.success) {
        // Refresh users list
        await fetchUsers();
        
        // If the member has been assigned to a trainer, trigger an event to refresh the trainer stats
        if (formData.requiresTrainer && formData.assignedTrainer) {
          // Create and dispatch a custom event
          const event = new CustomEvent('memberAssignmentChanged', {
            detail: {
              memberId: selectedMember.id,
              trainerId: formData.assignedTrainer
            }
          });
          window.dispatchEvent(event);
          console.log(`Dispatched memberAssignmentChanged event for trainer ${formData.assignedTrainer}`);
        }
        
        setMessage({ type: 'success', text: 'Member updated successfully' });
        toast.success('Member updated successfully');
        
        // Close detail view after a short delay
        setTimeout(() => {
          handleCloseDetailView();
        }, 1500);
      } else {
        console.error('Failed to update member:', result);
        setMessage({ type: 'error', text: result.message || 'Failed to update member' });
        toast.error(result.message || 'Failed to update member');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating the member' });
      toast.error('An error occurred while updating the member');
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Handle delete member
  const handleDeleteMember = async (memberId) => {
    if (!memberId) {
      toast.error('Invalid member ID');
      setFormSubmitting(false);
      setShowDeleteConfirm(false);
      return;
    }
    
    try {
      setFormSubmitting(true);
      console.log(`Attempting to delete member with ID: ${memberId}`);
      
      // Use the deleteMember function from AuthContext
      const result = await deleteMember(memberId);
      
      console.log('Delete response:', result);
      
      if (result.success) {
        // Refresh users list
        await fetchUsers();
        
        toast.success('Member deleted successfully');
        
        // Close detail view if open
        if (showDetailView) {
          handleCloseDetailView();
        }
      } else {
        toast.error(result.message || 'Failed to delete member');
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('An error occurred while deleting the member');
    } finally {
      // Close delete confirmation
      setShowDeleteConfirm(false);
      setFormSubmitting(false);
    }
  };
  
  // Handle payment completion
  const handlePaymentComplete = async (paymentData) => {
    if (!pendingMemberData) return;
    
    setFormSubmitting(true);
    setMessage({ type: 'info', text: 'Creating member...' });
    
    try {
      // Add payment information to the member data
      const memberDataWithPayment = {
        ...pendingMemberData,
        // Map mobile to phone for backend compatibility
        phone: pendingMemberData.mobile || pendingMemberData.phone,
        paymentStatus: 'Paid',
        paymentId: paymentData.paymentId,
        paymentAmount: paymentData.amount || pendingMemberData.calculatedFee,
        paymentDate: paymentData.timestamp,
        // Include the new fields
        requiresTrainer: pendingMemberData.requiresTrainer || false,
        assignedTrainer: pendingMemberData.requiresTrainer && pendingMemberData.assignedTrainer ? pendingMemberData.assignedTrainer : null,
        membershipDuration: pendingMemberData.membershipDuration || '1',
        fitnessGoalDescription: pendingMemberData.fitnessGoalDescription || '',
        // Persist selected payment mode (default online)
        paymentMode: pendingMemberData.paymentMode || 'online',
        paymentMethod: (pendingMemberData.paymentMode || 'online'),
        agreedAmount: Number(pendingMemberData.agreedAmount ?? 0)
      };
      
      // Remove mobile field to avoid confusion
      delete memberDataWithPayment.mobile;
      
      // Create the member
      console.log('Creating member with data:', memberDataWithPayment);
      const result = await createMember(memberDataWithPayment);
      console.log('Member creation result:', result);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        resetForm();
        setShowAddForm(false);
        setShowPaymentModal(false);
        setPendingMemberData(null);
        setFormStep(1); // Reset to first step
        
        // Refresh members list
        await fetchUsers();
        
        // If the new member has been assigned to a trainer, trigger an event to refresh the trainer stats
        if (memberDataWithPayment.requiresTrainer && memberDataWithPayment.assignedTrainer) {
          // Create and dispatch a custom event
          const event = new CustomEvent('memberAssignmentChanged', {
            detail: {
              memberId: result.user?._id,
              trainerId: memberDataWithPayment.assignedTrainer
            }
          });
          window.dispatchEvent(event);
          console.log(`Dispatched memberAssignmentChanged event for trainer ${memberDataWithPayment.assignedTrainer}`);
        }
        
        // Show success toast
        toast.success("Member created successfully with payment verification");
      } else {
        setMessage({ type: 'error', text: result.message });
        toast.error(result.message || 'Failed to create member');
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Error creating member:', error);
      setMessage({ type: 'error', text: 'An error occurred while creating the member' });
      setShowPaymentModal(false);
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Handle form step navigation - memoized to prevent unnecessary re-renders
  const handleNextStep = useCallback((e) => {
    e.preventDefault();
    
    // Validate current step
    if (formStep === 1) {
      // Validate basic information
      if (!formData.name || !formData.email || !formData.password) {
        setMessage({ type: 'error', text: 'Name, email, and password are required' });
        return;
      }
      
      // Validate password length
      if (formData.password.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
        return;
      }
      
      // Clear any error messages
      setMessage({ type: '', text: '' });
      
      // Move to next step
      setFormStep(2);
      return;
    }
    
    if (formStep === 2) {
      // Validate membership details
      if (!formData.goal || !formData.fitnessGoalDescription) {
        setMessage({ type: 'error', text: 'Please specify fitness goal and description' });
        return;
      }
      
      // Validate plan selection
      if (!formData.planType) {
        setMessage({ type: 'error', text: 'Please select a membership plan' });
        return;
      }
      
      // Validate that plans are available
      if (gymOwnerPlans.length === 0) {
        setMessage({ type: 'error', text: 'No membership plans available. Please create your membership plans first.' });
        return;
      }
      
      // Validate duration
      if (!formData.membershipDuration || formData.membershipDuration === 'custom' && !customDuration) {
        setMessage({ type: 'error', text: 'Please select a valid membership duration' });
        return;
      }
      
      // Validate trainer selection if requiresTrainer is true
      if (formData.requiresTrainer && !formData.assignedTrainer) {
        setMessage({ type: 'error', text: 'Please select a trainer' });
        return;
      }
      
      // Clear any error messages
      setMessage({ type: '', text: '' });
      
      // Move to final review step
      setFormStep(3);
      return;
    }
  }, [formStep, formData]);
  
  const handlePreviousStep = useCallback(() => {
    if (formStep > 1) {
      setFormStep(formStep - 1);
    }
  }, [formStep]);
  
  const handleCreateMember = useCallback(async (e) => {
    e.preventDefault();
    
    // Subscription gating removed: allowing member creation regardless of subscription status or member cap
    
    // Check if plans are available
    if (gymOwnerPlans.length === 0) {
      setMessage({ 
        type: 'error', 
        text: 'No membership plans available. Please create your membership plans first.' 
      });
      return;
    }
    
    // Prevent duplicate email before initiating payment
    const enteredEmail = (formData.email || '').trim().toLowerCase();
    const duplicateEmail = users?.some(u => (u.email || '').trim().toLowerCase() === enteredEmail);
    if (duplicateEmail) {
      setMessage({ 
        type: 'error', 
        text: 'Email already registered. Use a different email or add membership to the existing member.' 
      });
      toast.error('Email already exists');
      return;
    }

    // Find the selected plan
    const selectedPlan = gymOwnerPlans.find(plan => plan.name === formData.planType);
    
    if (!selectedPlan) {
      setMessage({ 
        type: 'error', 
        text: 'Please select a valid membership plan.' 
      });
      return;
    }
    
    const durationInMonths = parseInt(formData.membershipDuration); // Duration is already in months
    
    // Calculate plan cost based on duration
    let planCost = 0;
    const planPrice = parseFloat(selectedPlan.price) || 0;
    const planDuration = selectedPlan.duration;
    
    // Calculate cost based on plan duration type and selected duration
    if (planDuration === 'monthly') {
      planCost = planPrice * durationInMonths;
    } else if (planDuration === 'yearly') {
      planCost = planPrice * Math.ceil(durationInMonths / 12);
    } else if (planDuration === 'quarterly') {
      planCost = planPrice * Math.ceil(durationInMonths / 3);
    } else {
      // Default to monthly if duration type is unclear
      planCost = planPrice * durationInMonths;
    }
    
    // Calculate trainer fee based on selected trainer's actual fee
    let totalTrainerCost = 0;
    if (formData.requiresTrainer && formData.assignedTrainer) {
      const selectedTrainer = availableTrainers.find(trainer => trainer._id === formData.assignedTrainer);
      if (selectedTrainer) {
        // Use trainer's fee if available, check both trainerFee and salary fields
        const monthlyTrainerFee = getTrainerFee(selectedTrainer);
        console.log(`Using trainer fee: ₹${monthlyTrainerFee} for trainer: ${selectedTrainer.name}`);
        
        if (monthlyTrainerFee === 0) {
          console.warn(`No fee set for trainer: ${selectedTrainer.name}. Please set trainer fee in trainer profile.`);
          setMessage({ 
            type: 'error', 
            text: `Cannot proceed: No fee is set for trainer "${selectedTrainer.name}". Please update the trainer's fee in their profile before creating a member with this trainer.` 
          });
          return; // Stop execution - don't show payment modal
        }
        
        totalTrainerCost = monthlyTrainerFee * durationInMonths;
      } else {
        console.warn('Selected trainer not found in available trainers list');
        setMessage({ 
          type: 'error', 
          text: 'Selected trainer not found. Please select a valid trainer.' 
        });
        return;
      }
    }
    
    // Calculate total fee based on plan cost and trainer cost
    const totalFee = planCost + totalTrainerCost;
  
    
    // Store the member data with calculated fee
    const nextPending = {
      ...formData,
      calculatedFee: totalFee,
      paymentBreakdown: {
        planName: selectedPlan.name,
        planPrice: planPrice,
        planDuration: planDuration,
        planCost: planCost,
        selectedDuration: durationInMonths,
        trainerCost: totalTrainerCost,
        totalAmount: totalFee
      }
    };

    // If cash selected, create member directly without online payment modal
    if (nextPending.paymentMode === 'cash') {
      try {
        setFormSubmitting(true);
        const payload = {
          ...nextPending,
          phone: nextPending.mobile || nextPending.phone,
          paymentStatus: 'Paid',
          paymentMode: 'cash',
          paymentMethod: 'cash',
          agreedAmount: Number(nextPending.agreedAmount ?? 0),
          requiresTrainer: nextPending.requiresTrainer || false,
          assignedTrainer: nextPending.requiresTrainer && nextPending.assignedTrainer ? nextPending.assignedTrainer : null,
          membershipDuration: nextPending.membershipDuration || '1',
          fitnessGoalDescription: nextPending.fitnessGoalDescription || ''
        };
        delete payload.mobile;
        const result = await createMember(payload);
        if (result.success) {
          setMessage({ type: 'success', text: result.message || 'Member created successfully' });
          resetForm();
          setShowAddForm(false);
          setFormStep(1);
          await fetchUsers();
          toast.success('Member created successfully with cash payment');
        } else {
          setMessage({ type: 'error', text: result.message || 'Failed to create member' });
        }
      } catch (err) {
        console.error('Error creating member (cash):', err);
        setMessage({ type: 'error', text: 'An error occurred while creating the member' });
      } finally {
        setFormSubmitting(false);
      }
    } else {
      // Online payment: show QR payment modal
      setPendingMemberData(nextPending);
      setShowPaymentModal(true);
      setMessage({ type: 'info', text: 'Please complete the payment to create the member' });
    }
}, [formData, subscriptionInfo, gymOwnerPlans, availableTrainers, setMessage, setPendingMemberData, setShowPaymentModal]);

  // Add Member handler
  const handleAddMember = async (form) => {
    setFormSubmitting(true);
    try {
      // You may want to add gymId, createdBy, etc. here based on context
      const payload = {
        ...form,
        createdBy: user?._id,
        gymId: user?.gymId,
      };
      const result = await createMember(payload);
      if (result.success) {
        toast.success("Member added successfully");
        setShowAddForm(false);
        await fetchUsers();
      } else {
        toast.error(result.message || "Failed to add member");
      }
    } catch (err) {
      toast.error("Error adding member");
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {isTrainer ? 'My Assigned Members' : 'Member Management'}
              </h1>
              <p className="text-gray-400">
                {isTrainer 
                  ? 'View and manage members assigned to you' 
                  : 'Manage gym members, assignments, and goals'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={isLoading}
                onClick={async () => {
                  // Use a small delay before showing loading state to prevent flickering
                  const loadingTimer = setTimeout(() => {
                    setIsLoading(true);
                  }, 300);
                  
                  try {
                    // Force refresh all data
                    const promises = [
                      fetchUsers(true)
                    ];
                    
                    if (user && isGymOwner) {
                      promises.push(checkSubscriptionStatus(user._id, null, true));
                    }
                    
                    // Wait for all promises to resolve
                    await Promise.all(promises);
                    
                    // Then fetch subscription info if needed
                    if (user && isGymOwner) {
                      await fetchSubscriptionInfo();
                    }
                    
                    toast.success("Data refreshed successfully");
                  } catch (error) {
                    console.error("Error refreshing data:", error);
                    toast.error("Failed to refresh data");
                  } finally {
                    clearTimeout(loadingTimer);
                    // Small delay before removing loading state to prevent flickering
                    setTimeout(() => {
                      setIsLoading(false);
                    }, 300);
                  }
                }}
              >
                {isLoading ? (
                  <div className="animate-spin mr-2">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              
              {isGymOwner && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowAddForm(true)}
                  disabled={!subscriptionInfo.hasActiveSubscription || subscriptionInfo.currentMembers >= subscriptionInfo.maxMembers}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Member
                  {subscriptionInfo.hasActiveSubscription ? 
                    ` (${subscriptionInfo.currentMembers}/${subscriptionInfo.maxMembers})` : 
                    ' (Inactive Subscription)'}
                </Button>
                // <Button onClick={() => setShowManualReceiptModal(true)} className="bg-gray-600 hover:bg-gray-700 ml-4">
                //   <CreditCard className="mr-2 h-4 w-4" />
                //   Send Manual Receipt
                // </Button>
              )}
            </div>
            
          </div>
          
          {/* Loading Indicator */}
          {isLoading && (
            <Card className="bg-blue-900/20 border-blue-800">
              <CardContent className="p-4 flex items-center justify-center">
                <div className="animate-spin mr-2">
                  <RefreshCw className="h-5 w-5 text-blue-400" />
                </div>
                <p className="text-blue-300">Loading member data...</p>
              </CardContent>
            </Card>
          )}
          
          {/* Subscription Warning */}
          {isGymOwner && !subscriptionInfo.hasActiveSubscription && !isLoading && (
            <Card className="bg-red-900/20 border-red-800">
              <CardContent className="p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-medium">Inactive Subscription</h3>
                  <p className="text-gray-300 text-sm">
                    Your subscription is inactive. Please renew your subscription to add new members.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-red-700 text-red-300 hover:bg-red-800/50"
                      onClick={() => navigate("/gym-owner-plans")}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Renew Subscription
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-yellow-700 text-yellow-300 hover:bg-yellow-800/50"
                      onClick={async () => {
                        // Force refresh subscription status
                        setIsLoading(true);
                        if (checkSubscriptionStatus) {
                          await checkSubscriptionStatus(user._id, null, true);
                        }
                        await fetchSubscriptionInfo();
                        setIsLoading(false);
                        toast.info("Subscription status refreshed");
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Status
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Member Limit Warning */}
          {isGymOwner && subscriptionInfo.hasActiveSubscription && subscriptionInfo.currentMembers >= subscriptionInfo.maxMembers && (
            <Card className="bg-yellow-900/20 border-yellow-800">
              <CardContent className="p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-medium">Member Limit Reached</h3>
                  <p className="text-gray-300 text-sm">
                    You have reached the maximum member limit ({subscriptionInfo.maxMembers}) for your subscription plan.
                    Please upgrade your plan to add more members.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 border-yellow-700 text-yellow-300 hover:bg-yellow-800/50"
                    onClick={() => navigate("/gym-owner-plans")}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Member Limit Info */}
          {isGymOwner && subscriptionInfo.hasActiveSubscription && subscriptionInfo.currentMembers < subscriptionInfo.maxMembers && (
            <Card className="bg-blue-900/20 border-blue-800">
              <CardContent className="p-4 flex items-start space-x-3">
                <Users className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-medium">Member Capacity</h3>
                  <p className="text-gray-300 text-sm">
                    You have {subscriptionInfo.currentMembers} out of {subscriptionInfo.maxMembers} members.
                    You can add {subscriptionInfo.maxMembers - subscriptionInfo.currentMembers} more members with your current plan.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Member Detail View */}
          <MemberDetailView
            showDetailView={showDetailView}
            selectedMember={selectedMember}
            isEditMode={isEditMode}
            handleEditMember={isTrainer ? handleEditMember : undefined}
            handleCloseDetailView={handleCloseDetailView}
            handleUpdateMember={handleUpdateMember}
            setShowDeleteConfirm={setShowDeleteConfirm}
            formData={formData}
            setFormData={setFormData}
            handleInputChange={handleInputChange}
            formSubmitting={formSubmitting}
            message={message}
            gymOwnerPlans={gymOwnerPlans}
            availableTrainers={availableTrainers}
            getTrainerFee={getTrainerFee}
            getStatusBadge={getStatusBadge}
            getPlanBadge={getPlanBadge}
            getGoalBadge={getGoalBadge}
            navigate={navigate}
          />
          
          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && selectedMember && (
            <div 
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
              onClick={(e) => {
                // Prevent clicks on the backdrop from closing the modal
                e.stopPropagation();
              }}
            >
              <div 
                className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md w-full"
                onClick={(e) => {
                  // Prevent clicks on the modal from bubbling up
                  e.stopPropagation();
                }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Confirm Delete</h3>
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete {selectedMember.name}? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    disabled={formSubmitting}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (selectedMember && selectedMember.id) {
                        handleDeleteMember(selectedMember.id);
                      } else {
                        toast.error('Invalid member selected');
                        setShowDeleteConfirm(false);
                      }
                    }}
                    disabled={formSubmitting}
                    type="button"
                  >
                    {formSubmitting ? "Deleting..." : "Delete Member"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Stats Cards */}
          {isLoading ? (
            <div className="text-center p-8 bg-gray-800/30 rounded border border-gray-700">
              <p className="text-gray-400">Loading member statistics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Members</p>
                      <p className="text-2xl font-bold text-white">{memberStats.total}</p>
                    </div>
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active</p>
                      <p className="text-2xl font-bold text-white">{memberStats.active}</p>
                    </div>
                    <User className="h-6 w-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Weight Loss</p>
                      <p className="text-2xl font-bold text-white">{memberStats.weightLoss}</p>
                    </div>
                    <Target className="h-6 w-6 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Weight Gain</p>
                      <p className="text-2xl font-bold text-white">{memberStats.weightGain}</p>
                    </div>
                    <Target className="h-6 w-6 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Premium</p>
                      <p className="text-2xl font-bold text-white">{memberStats.premium}</p>
                    </div>
                    <CreditCard className="h-6 w-6 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search and Filters */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Member Directory</CardTitle>
              <CardDescription className="text-gray-400">
                Search and manage gym members with goal tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search members, emails, or trainers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                    disabled={isLoading}
                  />
                </div>
                <select
                  value={filterGoal}
                  onChange={(e) => setFilterGoal(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  disabled={isLoading}
                >
                  <option value="all">All Goals</option>
                  <option value="weight-loss">Weight Loss</option>
                  <option value="weight-gain">Weight Gain</option>
                  <option value="general-fitness">General Fitness</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  disabled={isLoading}
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              {/* Members Table */}
              {isLoading ? (
                <div className="text-center p-8 bg-gray-800/30 rounded border border-gray-700">
                  <p className="text-gray-400">Loading members...</p>
                </div>
              ) : (
                <div className="rounded-md border border-gray-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-gray-800/50">
                        <TableHead className="text-gray-300">Member Details</TableHead>
                        <TableHead className="text-gray-300">Contact</TableHead>
                        <TableHead className="text-gray-300">Goal & Plan</TableHead>
                        <TableHead className="text-gray-300">Trainer</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            {isLoading ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin mr-2">
                                  <RefreshCw className="h-5 w-5 text-blue-400" />
                                </div>
                                <p className="text-blue-300">Loading members...</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-gray-400 mb-2">No members found matching your filters.</p>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                  disabled={isLoading}
                                  onClick={async () => {
                                    // Use a small delay before showing loading state
                                    const loadingTimer = setTimeout(() => {
                                      setIsLoading(true);
                                    }, 300);
                                    
                                    try {
                                      await fetchUsers(true);
                                      if (user && isGymOwner) {
                                        await fetchSubscriptionInfo();
                                      }
                                    } catch (error) {
                                      console.error("Error refreshing data:", error);
                                    } finally {
                                      clearTimeout(loadingTimer);
                                      // Small delay before removing loading state
                                      setTimeout(() => {
                                        setIsLoading(false);
                                      }, 300);
                                    }
                                  }}
                                >
                                  {isLoading ? (
                                    <div className="animate-spin mr-2">
                                      <RefreshCw className="h-4 w-4" />
                                    </div>
                                  ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                  )}
                                  Refresh Data
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
    filteredMembers.map((member) => (
      <TableRow key={`member-${member.id}`} className="border-gray-700 hover:bg-gray-800/30">
        {/* Member Details */}
        <TableCell>
          <div>
            <p className="font-semibold text-white">{member.name}</p>
            <p className="text-gray-400 text-xs">{member.email}</p>
            <p className="text-gray-400 text-xs">{member.mobile || 'N/A'}</p>
          </div>
        </TableCell>
        {/* Contact */}
        <TableCell>
          <div className="space-y-1">
            <p className="text-white text-sm">{member.whatsapp || member.mobile || 'N/A'}</p>
            <p className="text-gray-400 text-xs">{member.address || 'No address'}</p>
          </div>
        </TableCell>
        {/* Goal & Plan */}
        <TableCell>
          <div className="space-y-1">
            <div>{getGoalBadge(member.goal)}</div>
            <div>{getPlanBadge(member.planType)}</div>
          </div>
        </TableCell>
        {/* Trainer */}
        <TableCell>
          <p className="text-white text-sm">
            {(() => {
              if (member.assignedTrainer) {
                const trainer = availableTrainers.find((t) => t._id === member.assignedTrainer);
                return trainer ? trainer.name : 'Not assigned';
              }
              return 'Not assigned';
            })()}
          </p>
        </TableCell>
        {/* Status */}
        <TableCell>
          {getStatusBadge(computeMembershipStatus(member))}
        </TableCell>
        {/* Actions */}
        <TableCell>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700" onClick={() => handleViewMember(member)}>
              <User className="h-4 w-4 mr-2" />
              View
            </Button>

            {/* Show Renew button when membership is inactive/expired */}
            {['Inactive', 'Expired'].includes(computeMembershipStatus(member)) && (
              <Button
                variant="outline"
                size="sm"
                className="border-green-800 text-green-300 hover:bg-green-900/30"
                onClick={() => {
                  // Open the AddMemberPayment modal with this member preselected
                  try {
                    setPendingMemberData({ type: 'renewal', memberId: member.id || member._id });
                    setShowPaymentModal(true);
                  } catch (e) {
                    console.error('Open renewal modal failed:', e);
                  }
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Renew
              </Button>
            )}

            {/* Trainers can edit; gym owners may only view/delete depending on role policies */}
            {isTrainer && (
              <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700" onClick={() => handleEditMember(member)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {isGymOwner && (
              <Button variant="outline" size="sm" className="border-red-800 text-red-300 hover:bg-red-900/30" onClick={() => { setSelectedMember(member); setShowDeleteConfirm(true); }}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    ))
  )}
</TableBody>
</Table>
</div>
) }

</CardContent>
</Card>
</div>
</div>

      {/* Add Member Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-lg max-w-xl w-full p-6 border border-gray-700 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
              onClick={() => setShowAddForm(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Add New Member</h2>
            <AddMemberForm
              onSubmit={handleAddMember}
              onCancel={() => setShowAddForm(false)}
              loading={formSubmitting}
              trainers={availableTrainers}
            />
          </div>
        </div>
      )}

      {/* Renewal Payment Modal */}
      {showPaymentModal && (
        <AddMemberPayment
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); setPendingMemberData(null); }}
          onPaymentAdded={async () => { await fetchUsers(true); toast.success('Renewal recorded'); }}
          initialMemberId={pendingMemberData?.memberId || pendingMemberData?.id || pendingMemberData?._id || ''}
        />
      )}
    </DashboardLayout>
  );
}

export default Members;