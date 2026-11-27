import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Bracket Night — A little friendly competition',description:'Turn your favorite movies, songs, and everything else into a shared tournament.',referrer:'no-referrer',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
