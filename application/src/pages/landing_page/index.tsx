import { BasicUserInfo, Hooks, useAuthContext } from "@asgardeo/auth-react";
import React, { FunctionComponent, ReactElement, useCallback, useEffect, useState } from "react";
import { default as authConfig } from "../../config.json"
import { DefaultLayout } from "../../layout/default";
import {ReservationListing} from "../../components";
import { useLocation } from "react-router-dom";
import { LogoutRequestDenied } from "../../components/LogoutRequestDenied";
import { USER_DENIED_LOGOUT } from "../../constants/errors";
import RoomListing from "../room_listing";
import { AppBar } from "@mui/material";
import Header from "../../layout/AppBar";

interface DerivedState {
    authenticateResponse: BasicUserInfo,
    idToken: string[],
    decodedIdTokenHeader: string,
    decodedIDTokenPayload: Record<string, string | number | boolean>;
}

/**
 * Landing page for the Sample.
 *
 * @param props - Props injected to the component.
 *
 * @return {React.ReactElement}
 */
export const LandingPage: FunctionComponent = (): ReactElement => {

    const {
        state,
        signIn,
        signOut,
        getBasicUserInfo,
        getIDToken,
        getDecodedIDToken,
        on
    } = useAuthContext();

    const [ derivedAuthenticationState, setDerivedAuthenticationState ] = useState<DerivedState>();
    const [ hasAuthenticationErrors, setHasAuthenticationErrors ] = useState<boolean>(false);
    const [ hasLogoutFailureError, setHasLogoutFailureError ] = useState<boolean>();

    const search = useLocation().search;
    const stateParam = new URLSearchParams(search).get('state');
    const errorDescParam = new URLSearchParams(search).get('error_description');

    useEffect(() => {

        if (!state?.isAuthenticated) {
            return;
        }

        (async (): Promise<void> => {
            const basicUserInfo = await getBasicUserInfo();
            const idToken = await getIDToken();
            const decodedIDToken = await getDecodedIDToken();

            const derivedState: DerivedState = {
                authenticateResponse: basicUserInfo,
                idToken: idToken.split("."),
                decodedIdTokenHeader: JSON.parse(atob(idToken.split(".")[0])),
                decodedIDTokenPayload: decodedIDToken
            };

            sessionStorage.setItem("userInfo",JSON.stringify({
              email: derivedState.decodedIDTokenPayload.username,
              id: derivedState.decodedIDTokenPayload.sub,
              name: derivedState.decodedIDTokenPayload.username,
              mobileNumber: derivedState.decodedIDTokenPayload.phone,
            }));

            setDerivedAuthenticationState(derivedState);
        })();
    }, [ state.isAuthenticated , getBasicUserInfo, getIDToken, getDecodedIDToken ]);

    useEffect(() => {
        if(stateParam && errorDescParam) {
            if(errorDescParam === "End User denied the logout request") {
                setHasLogoutFailureError(true);
            }
        }
    }, [stateParam, errorDescParam]);

    const handleLogin = useCallback(() => {
        setHasLogoutFailureError(false);
        signIn()
            .catch(() => setHasAuthenticationErrors(true));
    }, [ signIn ]);

   /**
     * handles the error occurs when the logout consent page is enabled
     * and the user clicks 'NO' at the logout consent page
     */
    useEffect(() => {
        on(Hooks.SignOut, () => {
            setHasLogoutFailureError(false);
        });

        on(Hooks.SignOutFailed, () => {
            if(!errorDescParam) {
                handleLogin();
            }
        })
    }, [ on, handleLogin, errorDescParam]);

    const handleLogout = () => {
        signOut();
    };

    if (hasLogoutFailureError) {
        return (
            <LogoutRequestDenied
                errorMessage={USER_DENIED_LOGOUT}
                handleLogin={handleLogin}
                handleLogout={handleLogout}
            />
        );
    }

    return (
        <DefaultLayout
            isLoading={ state.isLoading }
            hasErrors={ hasAuthenticationErrors }
        >   
            {state.isAuthenticated
                    ? (
                        <div className="content"  
                          >
                            <RoomListing/>                            
                        </div>
                    )
                    : (
                              
                        <div>
                        <h1 style={{fontSize:"100px",fontWeight:"bold",color:"black",WebkitTextStroke: "1px white"}}>Bright Royal Hotels</h1>          
                        <h3 style={{fontSize:"25px"}}>Where Comfort Meets Convenience</h3>          
                         
                         <button
                                className="btn primary" style={{margin:"10px"}}
                                onClick={ () => {
                                    handleLogin();
                                } }
                            >
                                Booking
                            </button>
                            <h4>We have a range of Accessible Double Rooms which help to meet your specific needs without any compromise on 4-star comfort during your stay. All our accessible rooms come complete with a wider entrance, fully and semi-adapted bathrooms and double beds for two adults.</h4>
                          
                            </div>
                   
                    )
            }
        </DefaultLayout>
    );
};
