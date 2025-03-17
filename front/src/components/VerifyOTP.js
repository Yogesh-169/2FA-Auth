import React, { useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/verify-otp", { email, otp });
      alert("User verified successfully!");
      navigate("/");
    } catch (error) {
      console.error("OTP verification failed", error);
    }
  };

  return (
    <div>
      <h2>Verify OTP</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Enter OTP" onChange={(e) => setOtp(e.target.value)} required />
        <button type="submit">Verify</button>
      </form>
    </div>
  );
};

export default VerifyOTP;
