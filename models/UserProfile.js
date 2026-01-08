import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  zipCode: String,
  country: String
}, { _id: false });

const userProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  role: { type: String, enum: ['customer', 'seller', 'ngo'], required: true },
  firstName: String,
  lastName: String,
  phone: String,
  address: addressSchema,
  avatar: String,
  bio: String
}, { timestamps: true });

userProfileSchema.methods.isComplete = function() {
  const hasName = Boolean((this.firstName || '').trim()) && Boolean((this.lastName || '').trim());
  const hasPhone = Boolean((this.phone || '').trim());
  const addr = this.address || {};
  const hasAddress = Boolean((addr.street || addr.city || addr.state || addr.zipCode || addr.country || '').toString().trim());
  return hasName && hasPhone && hasAddress;
};

userProfileSchema.index({ user: 1 }, { unique: true });
userProfileSchema.index({ role: 1 });

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;


