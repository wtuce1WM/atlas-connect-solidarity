import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, LayoutDashboard, Newspaper, UserSquare2, LayoutTemplate, Sparkles, ListOrdered } from "lucide-react";
import BlogManagement from "@/components/staff/BlogManagement";
import BlogDashboard from "@/components/staff/BlogDashboard";
import BlogTemplates from "@/components/staff/BlogTemplates";
import BlogGenerator from "@/components/staff/BlogGenerator";
import OwnerArticlesManagement from "@/components/staff/OwnerArticlesManagement";
import BlogOrderTab from "@/components/staff/BlogOrderTab";


import ScrollToTopButton from "@/components/staff/ScrollToTopButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const StaffBlog = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/staff/login"); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        navigate("/staff/login");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/staff/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/staff/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/staff/backoffice")} className="text-background/60 hover:text-background hover:bg-background/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src="/logo-gold.webp" alt="WTUCE Logo" className="h-10 w-10 object-contain" />
            <div>
              <span className="font-serif text-lg font-bold">
                <span className="text-gold">ONE WORLD</span>{" "}
                <span className="text-background">MOROCCO</span>
              </span>
              <p className="text-background/60 text-sm">Blog</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-background/60 text-sm hidden md:block">{user.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-black text-white border-black hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-8">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="articles" className="gap-2">
              <Newspaper className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="owner-articles" className="gap-2">
              <UserSquare2 className="h-4 w-4" />
              Articles propriétaires
            </TabsTrigger>
            <TabsTrigger value="order" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Ordre
            </TabsTrigger>

            <TabsTrigger value="templates" className="gap-2">
              <LayoutTemplate className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="generator" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Générateur
            </TabsTrigger>
          </TabsList>


          <TabsContent value="dashboard">
            <BlogDashboard />
          </TabsContent>


          <TabsContent value="articles">
            <BlogManagement />
          </TabsContent>

          <TabsContent value="owner-articles">
            <OwnerArticlesManagement />
          </TabsContent>

          <TabsContent value="order">
            <BlogOrderTab />
          </TabsContent>


          <TabsContent value="generator">
            <BlogGenerator />
          </TabsContent>

          <TabsContent value="templates">
            <BlogTemplates />

          </TabsContent>
        </Tabs>
      </main>

      <ScrollToTopButton />
    </div>
  );
};

export default StaffBlog;
