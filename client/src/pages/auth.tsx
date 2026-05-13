import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowRight, Sparkles, Eye, EyeOff, Briefcase, Phone, Globe, X, ChevronDown, Building2, MapPin, CheckCircle2 } from "lucide-react";
import koneksiLogo from "@assets/Koneksi_logo_1773055266438.png";

import { SERVICE_OPTIONS } from "@shared/schema";

const SA_PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
];

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registerType, setRegisterType] = useState<"resident" | "estate" | "supplier">("resident");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [customService, setCustomService] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  const [estateName, setEstateName] = useState("");
  const [estateStreetName, setEstateStreetName] = useState("");
  const [estateSuburb, setEstateSuburb] = useState("");
  const [estateCity, setEstateCity] = useState("");
  const [estateProvince, setEstateProvince] = useState("");
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);

  const [existingUserFound, setExistingUserFound] = useState<{ exists: boolean; fullName: string | null } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const { login, register } = useAuth();
  const { toast } = useToast();

  const checkEmailExists = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || mode !== "register" || registerType === "resident") {
      setExistingUserFound(null);
      return;
    }
    setCheckingEmail(true);
    try {
      const res = await apiRequest("POST", "/api/auth/check-email", { email: emailToCheck });
      const data = await res.json();
      setExistingUserFound(data);
    } catch {
      setExistingUserFound(null);
    } finally {
      setCheckingEmail(false);
    }
  }, [mode, registerType]);

  const toggleService = (service: string) => {
    setServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const addCustomService = () => {
    const trimmed = customService.trim();
    if (trimmed && !services.includes(trimmed)) {
      setServices((prev) => [...prev, trimmed]);
      setCustomService("");
    }
  };

  const removeService = (service: string) => {
    setServices((prev) => prev.filter((s) => s !== service));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else if (registerType === "supplier") {
        if (!businessName.trim()) {
          throw new Error("Business name is required");
        }
        if (services.length === 0) {
          throw new Error("Please select at least one service");
        }
        if (!phone.trim()) {
          throw new Error("Phone number is required");
        }
        const isExisting = existingUserFound?.exists === true;
        await register(email, password, isExisting ? (existingUserFound?.fullName || businessName) : (fullName || businessName), {
          registerAs: "supplier",
          businessName: businessName.trim(),
          businessWebsite: businessWebsite.trim() || undefined,
          services,
          phone: phone.trim(),
          contactEmail: contactEmail.trim() || undefined,
          existingUser: isExisting,
        });
        toast({
          title: isExisting ? "Supplier Profile Created" : "Account Submitted",
          description: isExisting ? "Your supplier profile has been submitted for review." : "We'll review and notify you soon.",
        });
      } else if (registerType === "estate") {
        if (!estateName.trim()) {
          throw new Error("Estate/Complex name is required");
        }
        const isExisting = existingUserFound?.exists === true;
        if (!isExisting && !fullName.trim()) {
          throw new Error("Your full name is required");
        }
        await register(email, password, isExisting ? (existingUserFound?.fullName || fullName) : fullName, {
          registerAs: "estate_admin",
          estateName: estateName.trim(),
          estateStreetName: estateStreetName.trim() || undefined,
          estateSuburb: estateSuburb.trim() || undefined,
          estateCity: estateCity.trim() || undefined,
          estateProvince: estateProvince || undefined,
          existingUser: isExisting,
        });
        toast({
          title: "Estate Registered",
          description: "Your estate has been created. Share the invite code with residents.",
        });
      } else {
        await register(email, password, fullName);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSupplierMode = mode === "register" && registerType === "supplier";
  const isEstateMode = mode === "register" && registerType === "estate";
  const isResidentMode = mode === "register" && registerType === "resident";

  const inputClass = "pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/40 rounded-xl focus:ring-2 focus:ring-white/30 focus:border-transparent";

  const registerTypes = [
    { key: "resident" as const, label: "Resident", icon: User },
    { key: "estate" as const, label: "Estate", icon: Building2 },
    { key: "supplier" as const, label: "Supplier", icon: Briefcase },
  ];

  const getSubmitLabel = () => {
    if (mode === "login") return "Sign In";
    if (isSupplierMode) return "Submit for Approval";
    if (isEstateMode) return "Register Estate";
    return "Create Account";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 gradient-teal opacity-90" />
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-300/15 blur-3xl" />
        <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-2xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center mb-8">
          <motion.img
            src={koneksiLogo}
            alt="Koneksi"
            className="h-10 mx-auto mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          />
          <motion.p
            className="text-white/80 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Smart estate management for modern communities
          </motion.p>
        </div>

        <motion.div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/10">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setExistingUserFound(null); }}
                data-testid={`button-${m}-tab`}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  mode === m
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-white/60 hover:text-white/80"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === "register" && (
              <motion.div
                key="register-type"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-5"
              >
                <Label className="text-white/90 text-sm mb-2 block">Register as</Label>
                <div className="flex gap-2">
                  {registerTypes.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      data-testid={`button-register-${key}`}
                      onClick={() => { setRegisterType(key); setExistingUserFound(null); }}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                        registerType === key
                          ? "bg-white/20 text-white border border-white/30"
                          : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "register" && (isResidentMode || (isEstateMode && !existingUserFound?.exists)) && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label className="text-white/90 text-sm mb-1.5 block">
                    {isEstateMode ? "Your Full Name (Admin)" : "Full Name"} {isEstateMode && <span className="text-red-400">*</span>}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      data-testid="input-fullname"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className={inputClass}
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {isEstateMode && (
                <motion.div
                  key="estate-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div>
                    <Label className="text-white/90 text-sm mb-1.5 block">
                      Estate / Complex Name <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        data-testid="input-estate-name"
                        value={estateName}
                        onChange={(e) => setEstateName(e.target.value)}
                        placeholder="e.g. Greenwood Estate"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/90 text-sm mb-1.5 block">Street Name</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        data-testid="input-estate-street-name"
                        value={estateStreetName}
                        onChange={(e) => setEstateStreetName(e.target.value)}
                        placeholder="e.g. 12 Oak Avenue"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/90 text-sm mb-1.5 block">Suburb</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        data-testid="input-estate-suburb"
                        value={estateSuburb}
                        onChange={(e) => setEstateSuburb(e.target.value)}
                        placeholder="e.g. Sandton"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/90 text-sm mb-1.5 block">City</Label>
                      <Input
                        data-testid="input-estate-city"
                        value={estateCity}
                        onChange={(e) => setEstateCity(e.target.value)}
                        placeholder="e.g. Johannesburg"
                        className="bg-white/10 border-white/15 text-white placeholder:text-white/40 rounded-xl focus:ring-2 focus:ring-white/30 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-white/90 text-sm mb-1.5 block">Province</Label>
                      <div className="relative">
                        <button
                          type="button"
                          data-testid="button-province-dropdown"
                          onClick={() => setShowProvinceDropdown(!showProvinceDropdown)}
                          className="w-full flex items-center justify-between py-2 px-3 bg-white/10 border border-white/15 text-sm rounded-xl hover:bg-white/15 transition-all h-10"
                        >
                          <span className={estateProvince ? "text-white" : "text-white/40"}>
                            {estateProvince || "Select"}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${showProvinceDropdown ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {showProvinceDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden max-h-40 overflow-y-auto"
                              style={{
                                background: "rgba(30, 60, 55, 0.95)",
                                backdropFilter: "blur(16px)",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                              }}
                            >
                              {SA_PROVINCES.map((prov) => (
                                <button
                                  key={prov}
                                  type="button"
                                  data-testid={`option-province-${prov.toLowerCase().replace(/\s+/g, "-")}`}
                                  onClick={() => {
                                    setEstateProvince(prov);
                                    setShowProvinceDropdown(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                    estateProvince === prov
                                      ? "bg-teal-500/30 text-white"
                                      : "text-white/70 hover:bg-white/10"
                                  }`}
                                >
                                  {prov}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {isSupplierMode && (
                <motion.div
                  key="supplier-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div>
                    <Label className="text-white/90 text-sm mb-1.5 block">
                      Business Name <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        data-testid="input-business-name"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Your business name"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/90 text-sm mb-1.5 block">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        data-testid="input-business-website"
                        value={businessWebsite}
                        onChange={(e) => setBusinessWebsite(e.target.value)}
                        placeholder="https://yourbusiness.co.za"
                        className={inputClass}
                        type="url"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/90 text-sm mb-1.5 block">
                      Services <span className="text-red-400">*</span>
                    </Label>

                    {services.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {services.map((service) => (
                          <Badge
                            key={service}
                            data-testid={`badge-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                            className="bg-teal-500/30 text-white border-teal-400/30 hover:bg-teal-500/40 cursor-pointer gap-1 py-1 px-2"
                            onClick={() => removeService(service)}
                          >
                            {service}
                            <X className="w-3 h-3" />
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <button
                        type="button"
                        data-testid="button-services-dropdown"
                        onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                        className="w-full flex items-center justify-between py-2.5 px-3 bg-white/10 border border-white/15 text-white/60 rounded-xl text-sm hover:bg-white/15 transition-all"
                      >
                        <span>{services.length === 0 ? "Select services..." : `${services.length} selected`}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showServiceDropdown ? "rotate-180" : ""}`} />
                      </button>

                      <AnimatePresence>
                        {showServiceDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                            style={{
                              background: "rgba(30, 60, 55, 0.95)",
                              backdropFilter: "blur(16px)",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                            }}
                          >
                            {SERVICE_OPTIONS.map((service) => (
                              <button
                                key={service}
                                type="button"
                                data-testid={`option-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                                onClick={() => toggleService(service)}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                  services.includes(service)
                                    ? "bg-teal-500/30 text-white"
                                    : "text-white/70 hover:bg-white/10"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                                    services.includes(service)
                                      ? "bg-teal-500 border-teal-400 text-white"
                                      : "border-white/30"
                                  }`}>
                                    {services.includes(service) && "✓"}
                                  </span>
                                  {service}
                                </span>
                              </button>
                            ))}

                            <div className="p-2 border-t border-white/10">
                              <div className="flex gap-1.5">
                                <Input
                                  data-testid="input-custom-service"
                                  value={customService}
                                  onChange={(e) => setCustomService(e.target.value)}
                                  placeholder="Other service..."
                                  className="flex-1 h-8 bg-white/10 border-white/15 text-white placeholder:text-white/40 rounded-lg text-xs"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      addCustomService();
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  data-testid="button-add-custom-service"
                                  onClick={addCustomService}
                                  size="sm"
                                  className="h-8 px-3 bg-teal-600 hover:bg-teal-500 rounded-lg text-xs"
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/90 text-sm mb-1.5 block">
                      Phone <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        data-testid="input-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="082 123 4567"
                        className={inputClass}
                        type="tel"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/90 text-sm mb-1.5 block">Contact Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        data-testid="input-contact-email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder={email || "Defaults to signup email"}
                        className={inputClass}
                        type="email"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label className="text-white/90 text-sm mb-1.5 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  data-testid="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setExistingUserFound(null);
                  }}
                  onBlur={() => checkEmailExists(email)}
                  placeholder="you@example.com"
                  className={inputClass}
                  required
                />
              </div>
              <AnimatePresence>
                {mode === "register" && (isEstateMode || isSupplierMode) && existingUserFound?.exists && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/30"
                    data-testid="text-existing-user-found"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <p className="text-xs text-emerald-200">
                      Account found for <span className="font-semibold">{existingUserFound.fullName}</span>. Enter your password to verify and continue.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-white/90 text-sm">
                  {existingUserFound?.exists && (isEstateMode || isSupplierMode) ? "Verify Password" : "Password"}
                </Label>
                {mode === "login" && (
                  <button
                    type="button"
                    data-testid="link-forgot-password"
                    onClick={() =>
                      toast({
                        title: "Password Reset",
                        description: "Check your email for a password reset link.",
                      })
                    }
                    className="text-xs text-white/60 hover:text-white/90 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={existingUserFound?.exists && (isEstateMode || isSupplierMode) ? "Enter your existing password" : "Min 6 characters"}
                  className="pl-10 pr-10 bg-white/10 border-white/15 text-white placeholder:text-white/40 rounded-xl focus:ring-2 focus:ring-white/30 focus:border-transparent"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  data-testid="button-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                data-testid="button-auth-submit"
                type="submit"
                disabled={isSubmitting}
                className={`w-full rounded-xl font-semibold py-6 text-base transition-all duration-200 ${
                  isSupplierMode || isEstateMode
                    ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-400 hover:to-emerald-400"
                    : "bg-white text-teal-700 hover:bg-white/90"
                }`}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <span className="flex items-center gap-2">
                    {getSubmitLabel()}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>

        <motion.p
          className="text-center mt-6 text-white/50 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          By continuing, you agree to our Terms of Service
        </motion.p>
      </motion.div>
    </div>
  );
}
