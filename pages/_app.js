import "tailwindcss/tailwind.css";
import "../styles/global.css";
import splitbee from "@splitbee/web";

export const config = {
	runtime: 'edge',
};

export const getServerSideProps = async () => {
	return {
		props: {
			runtime: process.env.NEXT_RUNTIME,
			uuid: await fetch('https://uuid.rocks/plain').then(response =>
				response.text(),
			),
		},
	};
};

function MyApp({ Component, pageProps }) {
  splitbee.init({
    scriptUrl: "/bee.js",
    apiUrl: "/_hive",
  });
  return <Component {...pageProps} />;
}
export default MyApp;
