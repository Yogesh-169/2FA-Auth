import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const Dashboard = () => {
    const [cameras, setCameras] = useState([]);

    useEffect(() => {
        fetchCameras();

        socket.on("cameraStatusUpdated", (updatedCamera) => {
            setCameras((prevCameras) =>
                prevCameras.map((camera) =>
                    camera._id === updatedCamera._id ? updatedCamera : camera
                )
            );
        });

        return () => socket.off("cameraStatusUpdated");
    }, []);


    const fetchCameras = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/cameras");
            const data = await res.json();
            setCameras(data);
        } catch (error) {
            console.error("Error fetching cameras:", error);
        }
    };

    const updateStatus = async (id, newStatus) => {
       
        try {
            const res = await fetch(`http://localhost:5000/api/cameras/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("Error updating status:", errorData.error);
                return;
            }

            const updatedCamera = await res.json();

            // 🔥 Optimistically update UI
            setCameras((prevCameras) =>
                prevCameras.map((camera) =>
                    camera._id === id ? { ...camera, status: newStatus } : camera
                )
            );
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };



    return (
        <div>
            <h2>Camera Status</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th>Room</th>
                        <th>Device ID</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {cameras.map(({ name, _id, status }) => (
                        <tr key={_id}>
                            <td>{name}</td>
                            <td>{_id}</td>  {/* Use _id instead of id */}
                            <td>
                                <select onChange={(e) => updateStatus(_id, e.target.value)} value={status}>
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>

            </table>
        </div>
    );
};

export default Dashboard;