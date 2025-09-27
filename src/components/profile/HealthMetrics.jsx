import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Target, Save, Loader2, X, Edit } from "lucide-react";

const HealthMetrics = ({ 
  user, 
  profileData, 
  handleInputChange, 
  isEditing,
  fitnessProgressEditing,
  setFitnessProgressEditing,
  handleFitnessProgressUpdate,
  isLoading
}) => {
  if (user?.role !== 'member') return null;

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Target className="h-5 w-5 mr-2 text-blue-400" />
          Health Metrics
        </CardTitle>
        <CardDescription className="text-gray-400">
          Track your fitness journey and progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="height" className="text-gray-300">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              value={profileData.height}
              onChange={(e) => handleInputChange("height", e.target.value)}
              disabled={!isEditing}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="weight" className="text-gray-300">Current Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              value={profileData.weight}
              onChange={(e) => handleInputChange("weight", e.target.value)}
              disabled={!isEditing}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="targetWeight" className="text-gray-300">Target Weight (kg)</Label>
            <Input
              id="targetWeight"
              type="number"
              value={profileData.targetWeight}
              onChange={(e) => handleInputChange("targetWeight", e.target.value)}
              disabled={!isEditing}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="fitnessGoal" className="text-gray-300">Fitness Goal</Label>
          <select
            id="fitnessGoal"
            value={profileData.fitnessGoal}
            onChange={(e) => handleInputChange("fitnessGoal", e.target.value)}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          >
            <option value="weight-loss">Weight Loss</option>
            <option value="weight-gain">Weight Gain</option>
            <option value="general-fitness">General Fitness</option>
          </select>
        </div>
        
        {/* Fitness Progress Section */}
        <div className="border-t border-gray-600 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-white">Fitness Progress</h4>
            {!fitnessProgressEditing && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFitnessProgressEditing(true)}
                className="bg-blue-600/20 hover:bg-blue-600/30 border-blue-500 text-blue-100"
              >
                <Edit className="h-4 w-4 mr-2" />
                Update Progress
              </Button>
            )}
            {fitnessProgressEditing && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFitnessProgressEditing(false)}
                  className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleFitnessProgressUpdate}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Progress
                </Button>
              </div>
            )}
          </div>
          
          {/* Progress Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-gray-700/30 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-300 text-sm">Initial Weight</p>
                  <p className="text-white font-medium">{profileData.initialWeight || 'Not set'} {profileData.initialWeight ? 'kg' : ''}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-gray-300 text-sm">Current Weight</p>
                  {fitnessProgressEditing ? (
                    <Input
                      type="number"
                      value={profileData.weight}
                      onChange={(e) => handleInputChange("weight", e.target.value)}
                      className="w-24 h-8 bg-gray-600 border-gray-500 text-white text-right"
                    />
                  ) : (
                    <p className="text-white font-medium">{profileData.weight || 'Not set'} {profileData.weight ? 'kg' : ''}</p>
                  )}
                </div>
              </div>
              
              {profileData.initialWeight && profileData.weight && (
                <div className="mt-3">
                  <p className="text-gray-300 text-sm mb-1">Weight Progress</p>
                  <div className="flex items-center">
                    <Progress 
                      value={Math.min(100, (parseFloat(profileData.weight) / parseFloat(profileData.targetWeight || profileData.initialWeight)) * 100)} 
                      className="h-2 flex-1"
                      indicatorClassName={
                        parseFloat(profileData.weight) < parseFloat(profileData.initialWeight) ? 'bg-green-500' : 'bg-red-500'
                      }
                    />
                    <span className={`ml-3 font-medium ${parseFloat(profileData.weight) < parseFloat(profileData.initialWeight) ? 'text-green-400' : 'text-red-400'}`}>
                      {parseFloat(profileData.weight) < parseFloat(profileData.initialWeight) ? '↓' : '↑'} 
                      {Math.abs(parseFloat(profileData.weight) - parseFloat(profileData.initialWeight)).toFixed(1)} kg
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-700/30 rounded-lg">
              <div>
                <p className="text-gray-300 text-sm mb-2">Progress Notes</p>
                {fitnessProgressEditing ? (
                  <textarea
                    value={profileData.progressNotes}
                    onChange={(e) => handleInputChange("progressNotes", e.target.value)}
                    className="w-full h-20 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm resize-none"
                    placeholder="Add notes about your progress..."
                  />
                ) : (
                  <p className="text-white text-sm">{profileData.progressNotes || 'No notes added yet'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthMetrics;