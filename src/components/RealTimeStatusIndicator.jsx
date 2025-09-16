import React from "react";

export default function RealTimeStatusIndicator({ isConnected = false, connectionStatus = "disconnected", messageCount = 0 }) {
  const color = isConnected ? "text-green-600" : "text-gray-500";
  return (
    <div className={`text-xs ${color}`}>
      {isConnected ? "●" : "○"} {connectionStatus} • messages: {messageCount}
    </div>
  );
}
