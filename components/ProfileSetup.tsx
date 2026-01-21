import { Camera, User } from 'lucide-react';
import { useRef, useState } from 'react';

interface ProfileData {
  name: string;
  bio: string;
  phoneNumber: string;
  profilePicture?: string;
}

interface ProfileSetupProps {
  onComplete: (data: ProfileData) => Promise<void>;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Create canvas to resize image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set maximum dimensions (200x200 for profile picture)
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress image
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with compression (0.7 quality for JPEG)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setProfilePicture(compressedDataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove spaces and dashes for validation
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // Check if starts with + (country code) or 0
    const startsWithPlus = cleanPhone.startsWith('+');
    const startsWithZero = cleanPhone.startsWith('0');
    
    if (!startsWithPlus && !startsWithZero) {
      setPhoneError('Phone number must start with + (country code) or 0');
      return false;
    }
    
    // Extract only digits (and + at the start)
    const digitsOnly = cleanPhone.replace(/[^\d+]/g, '');
    
    // Check if it contains only valid characters
    if (digitsOnly !== cleanPhone) {
      setPhoneError('Phone number contains invalid characters');
      return false;
    }
    
    // Count digits (excluding the + sign)
    const digitCount = digitsOnly.replace('+', '').length;
    
    // Must have between 10 and 15 digits
    if (digitCount < 10 || digitCount > 15) {
      setPhoneError('Phone number must be between 10 and 15 digits');
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    if (value.trim()) {
      validatePhoneNumber(value);
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!name.trim()) {
      return;
    }
    
    if (!phoneNumber.trim() || !validatePhoneNumber(phoneNumber)) {
      return;
    }
    
    await onComplete({
      name: name.trim(),
      bio: bio.trim(),
      phoneNumber: phoneNumber.trim(),
      profilePicture: profilePicture || undefined,
    });
  };

  const isValid = name.trim().length > 0 && phoneNumber.trim().length > 0 && !phoneError;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-white mb-2">Profile Info</h1>
          <p className="text-gray-400 text-sm">
            Please provide your name and phone number
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="flex justify-center mb-8">
            <button
              type="button"
              onClick={handleImageClick}
              className="relative group"
            >
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  background: profilePicture
                    ? 'transparent'
                    : 'linear-gradient(135deg, rgba(147, 51, 234, 0.4), rgba(99, 102, 241, 0.4))',
                }}
              >
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={48} className="text-white/60" />
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={32} className="text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-400 px-4">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
              required
            />
          </div>

          {/* Phone Number Input */}
          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-400 px-4">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+1 (555) 000-0000 or 0123456789"
              className={`w-full px-4 py-3 bg-gray-900/50 backdrop-blur-xl border rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all ${
                phoneError && phoneNumber.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-gray-800/50 focus:border-purple-500/50'
              }`}
              required
            />
            {phoneError && phoneNumber.trim() && (
              <p className="text-red-400 text-xs px-4">{phoneError}</p>
            )}
          </div>

          {/* Bio Input */}
          <div className="space-y-2">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-400 px-4">
              Bio (Optional)
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write something about yourself..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-medium text-white transition-all ${
              isValid
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 active:scale-[0.98]'
                : 'bg-gray-800 cursor-not-allowed opacity-50'
            }`}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
