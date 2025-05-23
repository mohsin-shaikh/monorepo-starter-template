import { updateSession } from '@pkg/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { createI18nMiddleware } from 'next-international/middleware'
import { createClient } from '@pkg/supabase/server';
import { selectedTeamIdCookieName } from './utils/team';

const I18nMiddleware = createI18nMiddleware({
  locales: ["en"],
  defaultLocale: "en",
  urlMappingStrategy: "rewrite",
});

export async function middleware(request: NextRequest) {
  const response = await updateSession(request, I18nMiddleware(request))
  const supabase = await createClient();
  const url = new URL("/", request.url);
  const nextUrl = request.nextUrl;

  const pathnameLocale = nextUrl.pathname.split("/", 2)?.[1];

  // Remove the locale from the pathname
  const pathnameWithoutLocale = pathnameLocale
    ? nextUrl.pathname.slice(pathnameLocale.length + 1)
    : nextUrl.pathname;

  // Create a new URL without the locale in the pathname
  const newUrl = new URL(pathnameWithoutLocale || "/", request.url);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Not authenticated
  if (
    !session &&
    newUrl.pathname !== "/login" &&
    // newUrl.pathname !== "/auth/login" && // TODO: Uncomment for supabase auth
    !newUrl.pathname.includes("/report") &&
    !newUrl.pathname.includes("/i/")
  ) {
    const encodedSearchParams = `${newUrl.pathname.substring(1)}${
      newUrl.search
    }`;

    const url = new URL("/login", request.url);
    // const url = new URL("/auth/login", request.url); // TODO: Uncomment for supabase auth

    if (encodedSearchParams) {
      url.searchParams.append("return_to", encodedSearchParams);
    }

    return NextResponse.redirect(url);
  }

  // If authenticated but no full_name redirect to user setup page
  if (
    newUrl.pathname !== "/setup" &&
    newUrl.pathname !== "/teams/create" &&
    session &&
    !session?.user?.user_metadata?.full_name
  ) {
    // Check if the URL contains an invite code
    const inviteCodeMatch = newUrl.pathname.startsWith("/teams/invite/");

    if (inviteCodeMatch) {
      return NextResponse.redirect(`${url.origin}${newUrl.pathname}`);
    }

    return NextResponse.redirect(`${url.origin}/setup`);
  }

  // Check for team selection
  if (
    session &&
    !newUrl.pathname.startsWith("/setup") &&
    !newUrl.pathname.startsWith("/teams") &&
    !request.cookies.has(selectedTeamIdCookieName)
  ) {
    return NextResponse.redirect(`${url.origin}/teams`);
  }

  const { data: mfaData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // Enrolled for mfa but not verified
  if (
    mfaData &&
    mfaData.nextLevel === "aal2" &&
    mfaData.nextLevel !== mfaData.currentLevel &&
    newUrl.pathname !== "/mfa/verify"
  ) {
    return NextResponse.redirect(`${url.origin}/mfa/verify`);
  }

  return response;
}

// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * Feel free to modify this pattern to include more paths.
//      */
//     '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
//   ],
// }

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|monitoring).*)"],
};
