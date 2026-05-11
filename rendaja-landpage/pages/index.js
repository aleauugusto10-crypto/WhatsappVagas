export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/shopping",
      permanent: false,
    },
  };
}

export default function Home() {
  return null;
}