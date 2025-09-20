import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminCheckIn: React.FC = () => {
  // Redirect to the new admin tools page
  return <Navigate to="/admin-tools" replace />;
};

export default AdminCheckIn;