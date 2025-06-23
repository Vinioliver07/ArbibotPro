import React, { useState, useEffect } from "react";
import { ArbitrageOpportunity } from "../Entities/index.js";
// import { Button } from "../Components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/ui/card";
// import { Badge } from "../Components/ui/badge";
// import { Input } from "../Components/ui/input";
import { 
  RefreshCw, 
  Zap, 
  AlertCircle,
  TrendingUp,
  Filter,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import StatsOverview from "../Components/dashboard/StatsOverview";
import OpportunityCard from "../Components/dashboard/OpportunityCard";
import PriceChart from "../Components/dashboard/PriceChart";

export default function Dashboard() {
  return <h2>Testando Dashboard!</h2>;
} 