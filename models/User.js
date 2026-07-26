import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email address',
            ],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters long'],
            select: false,
        },
        resetPasswordOtpHash: {
            type: String,
            select: false,
        },
        resetPasswordOtpExpires: {
            type: Date,
            select: false,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        isAccountActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to hash password securely
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        // next();
    } catch (error) {
        // next(error);
        console.log(error);
        
    }
});

// Instance method to cross-verify passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;