  import React, { useState, useEffect } from "react";
  import axios from "axios";
  import { useNavigate } from "react-router-dom";
  import GoogleLoginButton from "./GoogleLoginButton";

  const Login = () => {
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const navigate = useNavigate();

    useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      if (token) {
        localStorage.setItem("token", token);
        navigate("/dashboard");
      }
    }, []);

    const handleChange = (e) => {
      setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const response = await axios.post("http://localhost:5000/login", credentials);
        localStorage.setItem("token", response.data.token);
        navigate("/dashboard");
      } catch (error) {
        alert("Login failed: " + error.response.data.error);
      }
    };

    return (
      <div>
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
          <button type="submit">Login</button>
        </form>
        <GoogleLoginButton />
      </div>
    );
  };

  export default Login;
