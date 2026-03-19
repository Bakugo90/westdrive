import { RequestRegisterOtpDto } from './request-register-otp.dto';

// Backward-compatible alias while registration now requires OTP confirmation.
export class RegisterDto extends RequestRegisterOtpDto {}
