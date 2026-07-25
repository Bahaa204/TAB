import { useState, type MouseEvent } from "react";
import { Dialog, DialogPanel, PopoverGroup } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "/images/NavBarLogo.png";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { NavLink as NavLinkType } from "@/types/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { useDisplay3DModelsContext } from "@/context/Display3DModelsContext";

export default function Header() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showLogoutNotice, setShowLogoutNotice] = useState<boolean>(false);

  const NAVLINKS: NavLinkType[] = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About Us" },
    { to: "/projects", label: "Projects" },
    { to: "/support", label: "Support" },
    { to: "/favorites", label: "Favorites", requiresAuth: true },
    { to: "/contact", label: "Contact Us" },
    { to: "/staff", label: "Staff", requiresStaff: true },
  ];

  const {
    Session,
    GetRoleFromEmail,
    SignOut,
    Loading: AuthLoading,
  } = useAuth();

  const { Display3DModels, setDisplay3DModels } = useDisplay3DModelsContext();

  const condition =
    Session &&
    (GetRoleFromEmail(Session.user.email) === "admin" ||
      GetRoleFromEmail(Session.user.email) === "employee");

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const ok = await SignOut();
    if (ok) {
      setShowLogoutNotice(true);
      setTimeout(() => setShowLogoutNotice(false), 2500);
    }
  }

  const DisplayName: string =
    Session?.user.user_metadata?.display_name?.trim()[0] ||
    Session?.user.email?.[0];

  return (
    <>
      {showLogoutNotice && (
        <div className='fixed top-4 right-4 z-9999 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg'>
          Logged out successfully
        </div>
      )}
      <header className='bg-[#e6e0d8] z-5000 fixed w-full'>
        <nav
          aria-label='Global'
          className='mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8'
        >
          <div className='flex lg:flex-1'>
            <Link to='/' className='flex items-center gap-3'>
              <span className='sr-only'>Trusted Apartment Bridge - TAB</span>
              <img src={Logo} alt='Logo' className='w-25 h-10' />
            </Link>
          </div>
          <div className='flex lg:hidden'>
            <Button
              type='button'
              variant='link'
              onClick={() => setMobileMenuOpen(true)}
              className='-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 cursor-pointer'
            >
              <span className='sr-only'>Open main menu</span>
              <Bars3Icon aria-hidden='true' className='size-6' />
            </Button>
          </div>
          <PopoverGroup className='hidden lg:flex lg:gap-x-12'>
            {NAVLINKS.map((link, index) => {
              if (link.requiresStaff && !condition) return;
              if (link.requiresAuth && !Session) return;

              return (
                <NavLink
                  key={index}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    `text-sm/6 font-medium transition ${
                      isActive
                        ? "text-orange-500 underline decoration-2"
                        : "text-gray-600 hover:text-orange-500 hover:underline hover:decoration-2"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              );
            })}
          </PopoverGroup>
          <div className='hidden lg:flex lg:flex-1 lg:justify-end'>
            {!Session ? (
              <Button
                variant='link'
                className='cursor-pointer text-[14px] text-gray-600 hover:text-orange-500 hover:underline hover:decoration-2'
                onClick={() => navigate("/login")}
                disabled={AuthLoading}
              >
                Login
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger className='cursor-pointer bg-linear-to-br from-amber-400 to-orange-500 rounded-[50%] border-2 border-white'>
                  <div className='size-12 bg-linear-to-br flex items-center justify-center relative text-center'>
                    <span className='text-white/30 text-3xl font-black text-center'>
                      {DisplayName.toUpperCase()}
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-full relative top-5!'>
                  <DropdownMenuItem>
                    <p>Logged in as {Session.user.email}</p>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Switch
                      id='diplay-3d-models'
                      checked={Display3DModels}
                      onCheckedChange={setDisplay3DModels}
                    />
                    <Label htmlFor='diplay-3d-models'>Display 3D Models</Label>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Button
                      variant='destructive'
                      onClick={handleClick}
                      className='cursor-pointer'
                    >
                      Logout
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </nav>
        <Dialog
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
          className='lg:hidden'
        >
          <div className='fixed inset-0 z-5000' />
          <DialogPanel className='fixed inset-y-0 right-0 z-5000 w-full overflow-y-auto bg-[#e6e0d8] p-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10'>
            <div className='flex items-center justify-between'>
              <Link
                to='/'
                className='flex items-center gap-3'
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className='sr-only'>Trusted Apartment Bridge - TAB</span>
                <img src={Logo} alt='Logo' className='size-18' />
              </Link>
              <button
                type='button'
                onClick={() => setMobileMenuOpen(false)}
                className='-m-2.5 rounded-md p-2.5 text-gray-700'
              >
                <span className='sr-only'>Close menu</span>
                <XMarkIcon aria-hidden='true' className='size-6' />
              </button>
            </div>
            <div className='mt-6 flow-root'>
              <div className='-my-6 divide-y divide-gray-500/10'>
                <div className='space-y-2 py-6 flex flex-col'>
                  {NAVLINKS.map((link, index) => {
                    if (link.requiresStaff && !condition) return;
                    if (link.requiresAuth && !Session) return;

                    return (
                      <NavLink
                        key={index}
                        to={link.to}
                        end={link.to === "/"}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `text-lg font-medium transition ${
                            isActive
                              ? "text-orange-500 underline decoration-2"
                              : "text-gray-600 hover:text-orange-500 hover:underline hover:decoration-2"
                          }`
                        }
                      >
                        {link.label}
                      </NavLink>
                    );
                  })}
                </div>
                <div className='py-6'>
                  {!Session ? (
                    <Button
                      variant='link'
                      className='cursor-pointer text-lg text-gray-600 hover:text-orange-500 hover:underline hover:decoration-2'
                      onClick={() => {
                        navigate("/login");
                        setMobileMenuOpen(false);
                      }}
                      disabled={AuthLoading}
                    >
                      Login
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger className='cursor-pointer bg-linear-to-br from-amber-400 to-orange-500 rounded-[50%] border-2 border-white z-99999'>
                        <div className='size-12 bg-linear-to-br flex items-center justify-center relative text-center'>
                          <span className='text-white/30 text-3xl font-black text-center'>
                            {DisplayName.toUpperCase()}
                          </span>
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className='w-full z-99999'>
                        <DropdownMenuItem>
                          <p>Logged in as {Session.user.email}</p>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Switch
                            id='diplay-3d-models'
                            checked={Display3DModels}
                            onCheckedChange={setDisplay3DModels}
                          />
                          <Label htmlFor='diplay-3d-models'>
                            Display 3D Models
                          </Label>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Button
                            variant='destructive'
                            onClick={(event) => {
                              handleClick(event);
                              setMobileMenuOpen(false);
                            }}
                            className='cursor-pointer'
                          >
                            LogOut
                          </Button>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>
    </>
  );
}
